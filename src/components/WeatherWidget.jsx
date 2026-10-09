import { useState, useEffect } from 'react';
import { IconThermometer, IconWeather } from './icons/BrandIcons';

const WEATHER_CACHE_KEY = 'weather_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export default function WeatherWidget({ plzOrt, compact = false }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      setLoading(false);
      setError(true);
      return;
    }

    // Parse city name: Extract text after PLZ
    // Match optional digits and space, then capture the rest
    const cityMatch = plzOrt?.match(/^\d*\s*(.*)$/);
    const city = cityMatch ? cityMatch[1].trim() : plzOrt;

    if (!city) {
      setLoading(false);
      setError(true);
      return;
    }

    const fetchWeather = async () => {
      try {
        const cached = localStorage.getItem(`${WEATHER_CACHE_KEY}_${city}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setWeather(data);
            setLoading(false);
            return;
          }
        }

        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},CH&appid=${apiKey}&units=metric&lang=de`
        );

        if (!res.ok) {
          throw new Error('Weather fetch failed');
        }
        
        const data = await res.json();
        
        const weatherData = {
          temp: Math.round(data.main.temp),
          desc: data.weather[0].description,
          main: data.weather[0].main,
          city: data.name || city
        };

        localStorage.setItem(
          `${WEATHER_CACHE_KEY}_${city}`,
          JSON.stringify({ data: weatherData, timestamp: Date.now() })
        );

        setWeather(weatherData);
        setError(false);
      } catch (err) {
        console.error("Weather widget error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    
    const interval = setInterval(fetchWeather, CACHE_DURATION);
    return () => clearInterval(interval);
  }, [plzOrt]);

  if (error) return null;

  if (loading) {
    if (compact) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200/60 rounded-full text-xs text-text-secondary shadow-2xs">
          <IconThermometer className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>...</span>
        </div>
      );
    }
    return (
      <div className="bg-white border border-gray-200/60 rounded-2xl px-4 py-3 shadow-sm inline-flex items-center justify-center min-h-[48px] min-w-[120px]">
        <span className="text-gray-400 text-sm flex items-center gap-1.5">
          <IconThermometer className="w-4 h-4 text-amber-600 animate-pulse" />
          <span>Lädt...</span>
        </span>
      </div>
    );
  }

  if (!weather) return null;

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 rounded-full text-xs font-medium text-text-primary shadow-2xs shrink-0">
        <IconWeather condition={weather.main} className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="font-bold">{weather.temp}°C</span>
        <span className="text-text-secondary truncate max-w-[80px]">{weather.city}</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl px-4 py-3 shadow-sm inline-flex flex-col justify-center min-h-[48px]">
      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <IconWeather condition={weather.main} className="w-5 h-5 text-amber-600 shrink-0" />
        <span>{weather.temp}°C · {capitalize(weather.desc)}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {weather.city}
      </div>
    </div>
  );
}

