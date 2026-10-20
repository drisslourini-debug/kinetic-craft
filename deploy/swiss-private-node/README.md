# Kinetic Craft – Schweizer Private AI Node (Deployment Guide)

Dieser Leitfaden beschreibt die schlüsselfertige Bereitstellung einer **isolierten Schweizer Firmen-KI-Instanz** für Handwerksbetriebe (Enterprise-Kunden ab CHF 149.– / Mt.) bei Schweizer Cloud-Anbietern wie **Infomaniak** (Genf/Winterthur) oder **Exoscale** (Zürich).

---

## 1. Warum dieses Modell der Konkurrenz überlegen ist

| Kriterium | Hardware vor Ort (On-Premise) | US-Cloud (Bexio / ChatGPT) | Kinetic Private AI Node (Schweiz) |
| :--- | :--- | :--- | :--- |
| **Infrastruktur** | Mini-PC in Werkstatt | Geteilte US-Server | Dedizierter Schweizer VPS (Zürich/Genf) |
| **Wartung** | ❌ Staub, Stromausfall, Defekte | ✔ Keine eigene Wartung | ✔ **Null Hardware-Wartung für den Betrieb** |
| **Datenschutz** | Physisch vor Ort | ❌ US CLOUD Act Risiko | ✔ **100 % Schweizer revDSG-zertifiziert** |
| **Baustellen-Zugriff** | ❌ VPN/Port-Forwarding-Frust | ✔ Schnell | ✔ **Blitzschnell via HTTPS & Caddy** |
| **Firmenwissen (RAG)** | Meist unzureichend | ❌ Daten fliessen in US-Modelle | ✔ **Eigenes Firmen-Gedächtnis (pgvector)** |

---

## 2. Server-Voraussetzungen (Schweizer Provider)

Empfohlene Schweizer Hosting-Pakete:
- **Infomaniak Cloud VPS** (Genf / Winterthur) oder **Exoscale Compute Instance** (Zürich / Genf)
- **CPU:** Mindestens 4 vCPU
- **RAM:** 16 GB RAM (optimal für quantisierte 8B Modelle wie Llama 3.3 oder Mistral Small)
- **SSD/NVMe:** Mindestens 80 GB NVMe Storage
- **Betriebssystem:** Ubuntu 24.04 LTS oder Debian 12

---

## 3. Schlüsselfertige 5-Minuten-Installation

### Schritt 1: Repository / Deployment-Dateien auf den Server kopieren
```bash
mkdir -p /opt/kinetic-private-node
cd /opt/kinetic-private-node
# docker-compose.yml, Caddyfile und init-rag.sql hier ablegen
```

### Schritt 2: Umgebungsvariablen (.env) konfigurieren
```bash
cat <<EOF > .env
DOMAIN=node.muster-schreinerei.ch
POSTGRES_DB=kinetic_rag_db
POSTGRES_USER=kinetic_admin
POSTGRES_PASSWORD=$(openssl rand -hex 16)
EOF
```

### Schritt 3: Stack starten
```bash
docker compose up -d
```

### Schritt 4: Standard-Sprachmodell in Ollama laden
```bash
# Lädt Mistral Small oder Llama 3.3 herunter
docker compose exec ollama ollama run mistral
```

---

## 4. Anbindung an das Kinetic Craft CRM

1. Im Kinetic Craft Dashboard des Betriebs unter `Einstellungen > Private AI Node` aktivieren.
2. Webhook-URL hinterlegen: `https://node.muster-schreinerei.ch/webhook/kinetic-ai-action`
3. API-Token eintragen.
4. Alle Anfragen (Regieberichte, Offertenkalkulation, Kunden-Diktate) werden ab sofort **direkt auf dem Schweizer VPS des Kunden** verarbeitet. Keine Geschäftsgeheimnisse oder Margen verlassen die Schweiz.
