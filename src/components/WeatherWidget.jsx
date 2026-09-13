import { useState, useEffect } from 'react';

const WEATHER_CACHE_KEY = 'weather_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export default function WeatherWidget({ plzOrt }) {
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
    return (
      <div className="bg-white border border-gray-200/60 rounded-2xl px-4 py-3 shadow-sm inline-flex items-center justify-center min-h-[48px] min-w-[120px]">
        <span className="text-gray-400 text-sm">🌡️ Lädt...</span>
      </div>
    );
  }

  if (!weather) return null;

  const getEmoji = (main) => {
    switch (main?.toLowerCase()) {
      case 'clear': return '☀️';
      case 'clouds': return '☁️';
      case 'rain':
      case 'drizzle': return '🌧️';
      case 'thunderstorm': return '⛈️';
      case 'snow': return '❄️';
      case 'mist':
      case 'fog':
      case 'haze': return '🌫️';
      default: return '🌤️';
    }
  };

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl px-4 py-3 shadow-sm inline-flex flex-col justify-center min-h-[48px]">
      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <span>{getEmoji(weather.main)}</span>
        <span>{weather.temp}°C · {capitalize(weather.desc)}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {weather.city}
      </div>
    </div>
  );
}
