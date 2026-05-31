import fs from 'fs';

let content = fs.readFileSync('src/data.ts', 'utf8');

const updates: Record<string, { eventDate?: string, recurringEvent?: string }> = {
  "festival-ciclick": { eventDate: "2026-04-15" },
  "retrobikeshow1": { eventDate: "2026-04-20" },
  "pedaldefilicarbo": { eventDate: "2026-04-25" },
  "massa-critica-bcn": { recurringEvent: "first_friday_of_month" },
  "veneto-trail": { eventDate: "2026-05-10" },
};

for (const [id, data] of Object.entries(updates)) {
  const regex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?)(views:)`);
  content = content.replace(regex, (match, p1, p2) => {
    let additions = '';
    if (data.eventDate) additions += `eventDate: "${data.eventDate}",\n    `;
    if (data.recurringEvent) additions += `recurringEvent: "${data.recurringEvent}",\n    `;
    return `${p1}${additions}${p2}`;
  });
}

fs.writeFileSync('src/data.ts', content);
console.log('Updated events');
