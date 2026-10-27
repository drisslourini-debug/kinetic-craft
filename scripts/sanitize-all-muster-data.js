import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fpfdlraqtqtcnmajrcyx.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TENANT_ID = 'ce510545-c59b-4f0d-b89b-89f756cbb378';

// 85 Diverse Fictional Swiss Muster Companies and Private Persons
const MUSTER_POOL = [
  { firmenname: 'Muster Liegenschaften Bern AG', vorname: 'Thomas', nachname: 'Muster', typ: 'Bewirtschaftung', strasse: 'Mustergasse 5', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster & Partner Architekten AG', vorname: 'Corinne', nachname: 'Muster', typ: 'Firma', strasse: 'Musterweg 12', plz: '8000', ort: 'Zürich' },
  { firmenname: 'Muster Hotel Alpenblick AG', vorname: 'Beat', nachname: 'Muster', typ: 'Firma', strasse: 'Musterplatz 1', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Treuhand & Revisions AG', vorname: 'Monika', nachname: 'Muster', typ: 'Firma', strasse: 'Musterrain 3', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Gastronomie GmbH', vorname: 'Stefan', nachname: 'Muster', typ: 'Firma', strasse: 'Musterstrasse 88', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Bau & Generalunternehmung AG', vorname: 'Marc', nachname: 'Muster', typ: 'Generalunternehmer', strasse: 'Musterstrasse 20', plz: '3000', ort: 'Bern' },
  { firmenname: 'Musterverwaltung Bern AG', vorname: 'Hans', nachname: 'Muster', typ: 'Bewirtschaftung', strasse: 'Musterquai 8', plz: '3000', ort: 'Bern' },
  { firmenname: 'Immobilien Musterstadt AG', vorname: 'Peter', nachname: 'Muster', typ: 'Bewirtschaftung', strasse: 'Musterrain 14', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Wohnbau Genossenschaft', vorname: 'Urs', nachname: 'Muster', typ: 'Bewirtschaftung', strasse: 'Musterstrasse 50', plz: '3000', ort: 'Bern' },
  { firmenname: 'Beispiel Immobilien AG', vorname: 'Sandra', nachname: 'Beispiel', typ: 'Bewirtschaftung', strasse: 'Musterweg 18', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Fassadentechnik AG', vorname: 'Andreas', nachname: 'Muster', typ: 'Firma', strasse: 'Musterstrasse 14', plz: '4000', ort: 'Basel' },
  { firmenname: 'Muster Holzbau & Bedachung AG', vorname: 'Florian', nachname: 'Muster', typ: 'Firma', strasse: 'Musterrain 22', plz: '6000', ort: 'Luzern' },
  { firmenname: 'Muster Haustechnik Bern AG', vorname: 'Lukas', nachname: 'Muster', typ: 'Firma', strasse: 'Musterweg 30', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Elektro & Automation AG', vorname: 'David', nachname: 'Muster', typ: 'Firma', strasse: 'Musterstrasse 7', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Innenausbau & Design AG', vorname: 'Christian', nachname: 'Muster', typ: 'Firma', strasse: 'Musterplatz 4', plz: '8000', ort: 'Zürich' },
  { firmenname: 'Muster Raumakustik GmbH', vorname: 'Dominik', nachname: 'Muster', typ: 'Firma', strasse: 'Mustergasse 11', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Liegenschaftsverwaltung Zürich AG', vorname: 'Martin', nachname: 'Muster', typ: 'Bewirtschaftung', strasse: 'Musterrain 9', plz: '8000', ort: 'Zürich' },
  { firmenname: 'Muster Bauleitung & Sanierung AG', vorname: 'Daniel', nachname: 'Muster', typ: 'Generalunternehmer', strasse: 'Musterweg 25', plz: '4000', ort: 'Basel' },
  { firmenname: 'Beispiel Gastro & Hotel Betriebe AG', vorname: 'Felix', nachname: 'Beispiel', typ: 'Firma', strasse: 'Musterplatz 6', plz: '6000', ort: 'Luzern' },
  { firmenname: 'Muster Gewerbepark Bern AG', vorname: 'Rolf', nachname: 'Muster', typ: 'Bewirtschaftung', strasse: 'Musterstrasse 101', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Denkmalpflege & Restaurierung AG', vorname: 'Werner', nachname: 'Muster', typ: 'Firma', strasse: 'Musterrain 15', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Wohnresidenzen AG', vorname: 'Eveline', nachname: 'Muster', typ: 'Bewirtschaftung', strasse: 'Musterweg 3', plz: '8000', ort: 'Zürich' },
  { firmenname: 'Beispiel Architektur Studio Bern', vorname: 'Pascal', nachname: 'Beispiel', typ: 'Firma', strasse: 'Mustergasse 2', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Facility Services AG', vorname: 'Simon', nachname: 'Muster', typ: 'Firma', strasse: 'Musterstrasse 64', plz: '3000', ort: 'Bern' },
  { firmenname: 'Muster Immobilien Schweiz AG', vorname: 'Philipp', nachname: 'Muster', typ: 'Bewirtschaftung', strasse: 'Musterweg 40', plz: '3000', ort: 'Bern' },
  
  // Privatpersonen
  { firmenname: '', vorname: 'Dr. med. Thomas', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterstrasse 44', plz: '8000', ort: 'Zürich' },
  { firmenname: '', vorname: 'Beat & Marianne', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterweg 7', plz: '3000', ort: 'Bern' },
  { firmenname: '', vorname: 'Lukas & Corinne', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterstrasse 15', plz: '4000', ort: 'Basel' },
  { firmenname: '', vorname: 'Hans & Anna', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterrain 2', plz: '3000', ort: 'Bern' },
  { firmenname: '', vorname: 'Walter & Esther', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterweg 16', plz: '3000', ort: 'Bern' },
  { firmenname: '', vorname: 'Dr. iur. Bernhard', nachname: 'Muster', typ: 'Privatperson', strasse: 'Mustergasse 9', plz: '3000', ort: 'Bern' },
  { firmenname: '', vorname: 'Prof. Dr. Adrian', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterplatz 5', plz: '8000', ort: 'Zürich' },
  { firmenname: '', vorname: 'Marc & Nicole', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterrain 12', plz: '6000', ort: 'Luzern' },
  { firmenname: '', vorname: 'Patrick & Andrea', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterstrasse 28', plz: '3000', ort: 'Bern' },
  { firmenname: '', vorname: 'Claudia & Stefan', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterweg 21', plz: '3000', ort: 'Bern' },
  { firmenname: '', vorname: 'Karin & Matthias', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterrain 33', plz: '4000', ort: 'Basel' },
  { firmenname: '', vorname: 'Sandra & Christian', nachname: 'Muster', typ: 'Privatperson', strasse: 'Mustergasse 17', plz: '3000', ort: 'Bern' },
  { firmenname: '', vorname: 'Kurt & Elisabeth', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterstrasse 36', plz: '3000', ort: 'Bern' },
  { firmenname: '', vorname: 'Jürg & Barbara', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterplatz 8', plz: '8000', ort: 'Zürich' },
  { firmenname: '', vorname: 'Bruno & Silvia', nachname: 'Muster', typ: 'Privatperson', strasse: 'Musterweg 5', plz: '3000', ort: 'Bern' }
];

async function run() {
  console.log('Sanitizing customer records...');
  const { data: kunden } = await supabase.from('kunden').select('id, kundennummer').eq('tenant_id', TENANT_ID).order('id');
  
  for (let i = 0; i < kunden.length; i++) {
    const k = kunden[i];
    const template = MUSTER_POOL[i % MUSTER_POOL.length];
    const isFirma = template.firmenname.length > 0;
    const indexSuffix = i >= MUSTER_POOL.length ? ` ${Math.floor(i / MUSTER_POOL.length) + 1}` : '';

    const firmenname = isFirma 
      ? (indexSuffix ? template.firmenname.replace(' AG', `${indexSuffix} AG`).replace(' GmbH', `${indexSuffix} GmbH`) : template.firmenname)
      : '';
    
    const vorname = template.vorname;
    const nachname = template.nachname;
    const name = isFirma ? firmenname : `${vorname} ${nachname}${indexSuffix}`;
    const email = isFirma 
      ? `kontakt@${firmenname.toLowerCase().replace(/[^a-z0-9]/g, '')}.ch`
      : `${vorname.toLowerCase().replace(/[^a-z0-9]/g, '')}.${nachname.toLowerCase()}@muster-mail.ch`;

    await supabase.from('kunden').update({
      kundennummer: `K-${1000 + i + 1}`,
      name: name,
      firmenname: firmenname,
      vorname: vorname,
      nachname: nachname,
      typ: template.typ,
      email: email,
      website: isFirma ? `https://www.${firmenname.toLowerCase().replace(/[^a-z0-9]/g, '')}.ch` : '',
      strasse: template.strasse,
      plz: template.plz,
      ort: template.ort,
      land: 'Schweiz',
      telefon: '031 999 ' + String(10 + (i % 80)).padStart(2, '0') + ' ' + String(20 + (i % 70)).padStart(2, '0'),
      notizen: 'Fiktiver Schweizer Musterkunde für Demo & Kundenansicht.'
    }).eq('id', k.id);
  }

  console.log(`✅ ${kunden.length} Kunden vollständig aktualisiert!`);
}

run().catch(console.error);
