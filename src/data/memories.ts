import { MemoryTimelineItem } from '../types/study';

export interface RomanticData {
  relationshipStartDate: string; // ISO string
  callSigns: {
    him: string;
    her: string;
    duo: string;
  };
  loveLetter: {
    title: string;
    recipient: string;
    sender: string;
    paragraphs: string[];
    postscript: string;
  };
  timeline: MemoryTimelineItem[];
  polaroids: {
    id: string;
    title: string;
    caption: string;
    date: string;
    tag: string;
    bgColor: string;
    imageUrl?: string;
  }[];
  secretQuotes: string[];
}

export const ROMANTIC_DATA: RomanticData = {
  relationshipStartDate: '2024-05-18T00:00:00+08:00', // May 18, 2024
  callSigns: {
    him: 'Chobee / Baby Bear 🧸 #33',
    her: 'Mayor Cia / Pretty Bunny 🐰 #14',
    duo: 'Baby Bear & ChiCha 🩵🌸'
  },
  loveLetter: {
    title: 'Para sa Pinakapaborito Kong Class Rep & Mayor 🧸🩵',
    recipient: 'My Pretty Mayor Cia / ChiCha 🌸',
    sender: 'Your Baby Bear Chobee (#33) 🧸',
    paragraphs: [
      'Hii love lovee ko! 🌸 Alam kong minsan napapagod ka na sa dami ng inaasikaso—sa Tourism Week, sa scripts, sa rehearsals, sa finance reports, at sa mga responsibilidad mo. Nakikita ko kung gaano ka kasipag, kung paano mo inaalagaan ang lahat bago ang sarili mo.',
      'Kaya ginawa ko itong platform na ito para sa’yo. Ayokong nai-stress ka pa kakagawa ng reviewers kapag madaling araw na. Gusto ko, may automated AI companion ka na mabilis mag-summarize at mag-generate ng quizzes at flashcards para makapagpahinga ka nang mas maaga at makatulog nang mahimbing.',
      'Saan man magpunta ang araw mo, tandaan mo na laging nandito ang Baby Bear mo bilang safe space mo. Hindi mo kailangang maging "Mayor" kapag kasama mo ako—dito, ikaw lang ang aking ChiCha, ang pinakamagandang melody sa buhay ko.',
      'Super proud ako sa’yo palagi, baby ko. You are more than capable, you are brilliant, and you are deeply, unconditionally loved. 🧸🩵'
    ],
    postscript: 'P.S. Uminom ka na ba ng water ngayon? Inhale... Exhale... proud na proud ako sa’yo palagi! 🩵✨'
  },
  timeline: [
    {
      id: 'mem-1',
      dateStr: 'Late-Night Ritual',
      title: '7/11 Runs & Steaming Noodles',
      location: 'Near Campus / Corner 7-Eleven',
      tag: 'Food & Comfort',
      emoji: '🍜',
      description: 'Pagkatapos ng nakakapagod na committee meetings at rehearsals para sa school event, sabay tayong tatakas papuntang 7/11 para sa mainit na instant noodles, ice cream, at walang katapusang kwentuhan hanggang madaling araw.',
      chobeeQuote: '"Kahit gaano kapagod ang araw, nawawala lahat basta kasabay kitang kumain ng ice cream sa labas ng 7/11."'
    },
    {
      id: 'mem-2',
      dateStr: 'Study Nights',
      title: '24-Hour Marathon Discord Calls',
      location: 'Discord & FaceTime',
      tag: 'Study & Safe Space',
      emoji: '🎧',
      description: 'Yung tipong naka-mute pero naririnig ang tunog ng bawat keyboard clicks mo habang gumagawa ng script si Mayor at naga-asikaso si Baby Bear. Kahit makatulog sa call, panatag ang loob kasi alam nating magkasama tayo.',
      chobeeQuote: '"Hindi kailangang laging may sinasabi—basta nandyan ang boses mo sa background, buo na ang gabi ko."'
    },
    {
      id: 'mem-3',
      dateStr: 'Family & Milestone',
      title: 'Soft-Launching to Lola over Cassava Cake',
      location: 'Lola’s Dining Table',
      tag: 'Warmth & Family',
      emoji: '🍰',
      description: 'Ang kaba habang naghahanda ng cassava cake! Yung mga palihim na tinginan at pigil na ngiti sa ilalim ng mesa, hanggang sa ma-feel natin ang mainit na pagtanggap at basbas ni Lola.',
      chobeeQuote: '"Sobrang sarap nung cassava cake, pero mas matamis yung ngiti mo nung na-realize nating proud si Lola sa atin."'
    },
    {
      id: 'mem-4',
      dateStr: 'Gaming & Silliness',
      title: 'Building Pink Roblox Tiles & Chi-Bunny World',
      location: 'Roblox Co-op Server',
      tag: 'Playful Love',
      emoji: '🎮',
      description: 'Nagtutulungan magtayo ng cute pink houses, tumatalon sa mga obstacles, at naghahabulan gamit ang mga bunny avatars. Kahit matumba si Chi-Bunny, laging sasaluhin ni Chobee.',
      chobeeQuote: '"Kahit sa virtual world o sa totoong buhay, ikaw lang ang paborito kong kakampi sa kahit anong game."'
    },
    {
      id: 'mem-5',
      dateStr: 'Event Day',
      title: 'Tourism Week: Cheering for Our Mayor',
      location: 'University Grand Auditorium',
      tag: 'Pride & Joy',
      emoji: '👑',
      description: 'Nung umakyat ka sa stage para pangunahan ang Tourism Week program. Grabe ang poise at ganda mo, Cia. Hawak mo ang mic nang buong husay, habang ako ang pinakamalakas pumalakpak sa gitna ng crowd.',
      chobeeQuote: '"Sabi ko sa sarili ko habang pinapanood ka sa stage: Iyan ang Mayor ko, at napakaswerte kong ako ang Baby Bear niya."'
    }
  ],
  polaroids: [
    {
      id: 'pol-cam',
      title: 'Vintage Pink Cybershot 📸',
      caption: '"I could love you for the rest of my life • pretty soul, pretty girl" 🌸',
      date: 'Sweetest Snapshot',
      tag: 'Pretty Soul',
      bgColor: 'from-pink-100 to-rose-50',
      imageUrl: '/assets/aesthetic_vintage_camera.jpg'
    },
    {
      id: 'pol-sakura',
      title: 'Sakura Canopy in Bloom 🌸',
      caption: 'Spring flowers blooming as bright as your smile, Mayor Cia ✨',
      date: 'Springtime Dream',
      tag: 'Fairycore',
      bgColor: 'from-pink-100 to-pink-50',
      imageUrl: '/assets/aesthetic_sakura_bloom.jpg'
    },
    {
      id: 'pol-ribbon',
      title: 'Silk Ribbon & Pearls 🎀',
      caption: 'Delicate vintage romance & heartfelt handwritten letters 🕊️',
      date: 'Coquette Love',
      tag: 'Coquette',
      bgColor: 'from-rose-100 to-pink-50',
      imageUrl: '/assets/aesthetic_ribbon_pearls.jpg'
    },
    {
      id: 'pol-sanrio',
      title: 'Sanrio Sweethearts 🐰',
      caption: 'Baby Bear 🧸 x Chi-Bunny 🐰 in our peaceful pastel haven',
      date: 'Soulmates #33 & #14',
      tag: 'Sweethearts',
      bgColor: 'from-sky-100 to-pink-50',
      imageUrl: '/assets/aesthetic_sanrio_duo.jpg'
    },
    {
      id: 'pol-lilies',
      title: 'Lace & White Lilies 🕊️',
      caption: 'Pure elegance, gentle serenity, and deep unconditional love 🌿',
      date: 'Eternal Flower',
      tag: 'Elegance',
      bgColor: 'from-slate-100 to-pink-50',
      imageUrl: '/assets/aesthetic_lace_lilies.jpg'
    },
    {
      id: 'pol-melody',
      title: 'My Melody Study Room 🎀',
      caption: 'Cozy plushies cheering on our brilliant Class Rep ✨',
      date: 'Mayor Cia’s Desk',
      tag: 'Cozy Space',
      bgColor: 'from-pink-100 to-purple-50',
      imageUrl: '/assets/my_melody_plush.jpg'
    }
  ],
  secretQuotes: [
    'You are my favorite notification, my sweetest prayer, and my safest home. 🧸🩵',
    'Good job today, Mayor! Now let Baby Bear take care of your reviewers. 🌸',
    'Drink your water, breathe deeply, and smile because someone is completely in love with you. 🩵',
    'Mahal na mahal kita, baby Ciara ko! Ikaw ang pinakamagandang melody sa buhay ko. 💖'
  ]
};
