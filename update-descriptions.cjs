const fs = require('fs');

const descriptions = {
  "officina-battaglin": "Custom Italian steel road and gravel bikes meticulously handcrafted by the 1981 Giro-Vuelta winner Giovanni Battaglin. Combining legendary racing heritage with modern frame-building techniques, each frame is a masterpiece of Italian cycling history.",
  "ricca-cycling": "Ricca Cycling designs premium steel bicycles in Switzerland, which are then meticulously handcrafted in Europe. Their focus is on blending timeless aesthetics with modern geometry to create bikes that are both beautiful and highly capable on any terrain.",
  "diamantrad": "A historic German bicycle brand offering a wide range of production bikes, including gravel, urban, and e-bikes. With over a century of experience, Diamant continues to innovate while staying true to its roots of reliable, everyday cycling solutions.",
  "voodoo-cycles": "Voodoo Cycles offers a diverse range of production bikes including road, mountain, gravel, and e-bikes. Known for their distinctive styling and robust builds, they cater to riders looking for adventure and performance on the trails and roads.",
  "brevet-cycles": "Brevet Cycles specializes in bespoke custom builds and traditional frame building. Every bicycle is tailored to the rider's specific measurements and riding style, ensuring an unparalleled fit and a truly unique cycling experience.",
  "bikepacking-com": "The premier global resource for bikepacking routes, in-depth gear reviews, and inspiration for your next cycling adventure. A hub for the bikepacking community to share stories, tips, and breathtaking photography from around the world.",
  "division-cycling-club": "A performance-focused cycling club and community dedicated to pushing limits and fostering a competitive yet supportive environment. They organize group rides, training camps, and participate in races across the country.",
  "veni-vidi-cc": "A performance cycling club dedicated to pushing limits and exploring new horizons. Veni Vidi CC brings together passionate cyclists who share a love for speed, endurance, and the camaraderie of the peloton.",
  "mbo-cycling": "Premium technical cycling apparel designed for ultimate performance and comfort. MBO Cycling combines cutting-edge fabrics with sleek, aerodynamic designs to help riders perform at their best in all weather conditions.",
  "rad-race": "A dynamic cycling collective and event organizer, celebrating cycling culture and publishing. Known for their high-energy, unconventional races and strong community focus, Rad Race is redefining what it means to be a cyclist today.",
  "festival-ciclick": "A vibrant cycling festival celebrating bike culture, community, and the pure joy of riding. Featuring workshops, group rides, live music, and exhibitions, it's a gathering point for cyclists of all disciplines and backgrounds.",
  "primavera-ciclista-bergueda": "A beautiful celebration of cycling culture and community set in the stunning landscapes of Berguedà. This event brings together riders for a weekend of scenic routes, local food, and shared passion for the sport.",
  "cc-volata": "A premium cycling culture magazine and editorial platform that delves deep into the stories, people, and places that make cycling so special. Through stunning photography and compelling journalism, CC Volata captures the essence of the ride.",
  "atelier-medium": "An independent creator of high-quality, beautifully crafted bicycle components including forks, stems, headsets, and more. Atelier Medium focuses on precision engineering and elegant design to elevate any custom build.",
  "barzoale": "Specialists in meticulous bicycle restoration and unique custom builds. Barzoale breathes new life into classic frames, combining vintage charm with modern reliability to create truly one-of-a-kind bicycles.",
  "retrobikeshow1": "A dedicated festival celebrating the golden era of retro and classic bicycles. Enthusiasts gather to showcase meticulously restored vintage bikes, swap rare parts, and share their passion for cycling history.",
  "pedaldefilicarbo": "An inclusive touring cycling event and community that encourages riders to explore the world at their own pace. Focused on the journey rather than the destination, it's about shared experiences and the love of travel by bike.",
  "bikefriday": "High-performance custom folding bikes built by hand in Oregon. Bike Friday creates travel-friendly bicycles that don't compromise on ride quality, allowing cyclists to take their passion wherever they go.",
  "park-tool": "The world's largest and most trusted bicycle tool manufacturer, offering high-quality repair and maintenance tools for professional mechanics and home wrenchers alike. The iconic blue handles are a staple in workshops globally.",
  "tons-bike": "Premium 3D printed bike storage, stands, and organizers designed and sustainably made in Denmark. TONS combines minimalist Scandinavian design with innovative manufacturing to create elegant solutions for displaying and storing your bikes.",
  "hed-cycling": "Pioneers in aerodynamic cycling technology, HED Cycling manufactures high-performance wheels and components. With a legacy of innovation in wind tunnel testing, their products are designed to make every rider faster.",
  "wolftoothcomponents": "Innovative, precision-engineered cycling components and accessories made in the USA. Wolf Tooth is renowned for their problem-solving products, from chainrings and dropper levers to multi-tools that keep you riding.",
  "massa-critica-bcn": "A monthly mass bicycle ride in Barcelona celebrating cycling culture and advocating for safer, more accessible streets. It's a joyful, peaceful demonstration of the power and presence of cyclists in the urban environment.",
  "koolstop": "Legendary manufacturer of high-performance bicycle brake pads. Kool-Stop has been setting the standard for stopping power and rim-friendly compounds for decades, trusted by riders across all disciplines.",
  "veneto-trail": "An epic, unsupported bikepacking adventure across the diverse and challenging terrain of the Veneto region. Riders navigate a demanding route that showcases the stunning natural beauty and cultural heritage of northern Italy.",
  "little-james-arnold": "A talented visual artist and illustrator whose work captures the spirit, energy, and culture of cycling. Through vibrant colors and dynamic compositions, Little James Arnold brings the world of bikes to life on canvas and screen.",
  "courssilpleut": "Handmade cycling bags and carrying solutions crafted with care and attention to detail. Designed for durability and practicality, these bags are perfect for daily commutes, long tours, and everything in between."
};

let content = fs.readFileSync('src/data.ts', 'utf8');

for (const [id, newDesc] of Object.entries(descriptions)) {
  const regex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?description:\\s*")[^"]+(")`, 'g');
  content = content.replace(regex, `$1${newDesc}$2`);
}

fs.writeFileSync('src/data.ts', content);
console.log('Descriptions updated successfully!');
