/* My Wellness PWA — bundled content (all offline).
   Quranic excerpts: short passages, Saheeh International translation, with references.
   Motivational quotes & humor below are original lines written for this app —
   never attributed to the Quran. */
export const VERSES = [
  {
    id: 'v1', theme: 'Hope', ref: 'Ash-Sharh 94:5–6',
    ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    en: 'For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.',
    note: 'Said twice — the ease is woven into the hardship itself.',
  },
  {
    id: 'v2', theme: 'Patience', ref: 'Al-Baqarah 2:286',
    ar: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
    en: 'Allah does not charge a soul except [with that within] its capacity.',
    note: 'What you carry was measured to fit what you can bear.',
  },
  {
    id: 'v3', theme: 'Gratitude & Calm', ref: "Ar-Ra'd 13:28",
    ar: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    en: 'Unquestionably, by the remembrance of Allah hearts are assured.',
    note: 'For the believers whose hearts find rest in remembrance.',
  },
  {
    id: 'v4', theme: 'Trust & Mercy', ref: 'Az-Zumar 39:53',
    ar: 'لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا',
    en: 'Do not despair of the mercy of Allah. Indeed, Allah forgives all sins.',
    note: 'No version of you is beyond His mercy.',
  },
];
export const VERSE_SOURCE = 'English translation: Saheeh International. Arabic text: standard Madinah script. Saved on your device — available offline.';

export const WELLNESS = {
  happy: {
    icon: '😊', title: 'Happy',
    message: 'What a lovely moment. Happiness grows when we notice it — pause and let this one land.',
    breathing: null,
    action: 'Tell someone one small thing that made you smile today.',
    prompt: 'What exactly made today feel light? Describe it in detail so future-you can revisit it.',
  },
  sad: {
    icon: '💧', title: 'Sad',
    message: 'It is okay to feel sad. Sadness is not a failure — it is your heart asking for gentleness.',
    breathing: { inhale: 4, hold: 4, exhale: 6, rounds: 3 },
    action: 'Wrap yourself in something warm — a shawl, a blanket, warm hands around a cup.',
    prompt: 'What is weighing on you right now? Write it out without editing yourself.',
    comfort: 'v1',
  },
  stressed: {
    icon: '😮‍💨', title: 'Stressed',
    message: 'You are carrying a lot. Let us set it down for two minutes — the list will wait.',
    breathing: { inhale: 4, hold: 7, exhale: 8, rounds: 3 },
    action: 'Write down the three loudest worries, then circle only the one you can act on today.',
    prompt: 'What would "done enough for today" honestly look like?',
    comfort: 'v2',
  },
  angry: {
    icon: '😠', title: 'Angry',
    message: 'Anger usually means something mattered to you. Breathe first — respond later.',
    breathing: { inhale: 4, hold: 4, exhale: 6, rounds: 4 },
    action: 'Step away, drink cold water slowly, and give it 20 minutes before deciding anything.',
    prompt: 'What boundary of yours felt crossed? What would you wish had happened instead?',
  },
  overwhelmed: {
    icon: '🌊', title: 'Overwhelmed',
    message: 'When everything feels like too much, shrink the day to the next ten minutes only.',
    breathing: { inhale: 4, hold: 4, exhale: 6, rounds: 3 },
    action: 'Pick the single smallest task and do just that. One thing is a complete victory today.',
    prompt: 'List everything on your mind, then star the ONE thing that truly cannot wait.',
    comfort: 'v2',
  },
  lonely: {
    icon: '🌙', title: 'Lonely',
    message: 'Loneliness hurts, and it lies — it tells you no one cares, which is rarely true.',
    breathing: null,
    action: 'Send one short message to someone you trust: "thinking of you." Connection starts small.',
    prompt: 'Who has been kind to you lately? What would you like to say to them?',
    comfort: 'v3',
    trusted: true,
  },
  motivation: {
    icon: '✨', title: 'Need Motivation',
    message: 'You do not need to feel motivated to begin. Begin tiny, and motivation often follows.',
    breathing: null,
    action: 'Set a timer for 5 minutes and start the task badly on purpose. Bad starts still count.',
    prompt: 'What is one thing future-you will thank you for doing today?',
  },
  quiet: {
    icon: '🕊️', title: 'Need a Quiet Moment',
    message: 'The world can wait. This minute is only yours.',
    breathing: { inhale: 5, hold: 5, exhale: 5, rounds: 4 },
    action: 'Put the phone face-down, close your eyes, and listen to the furthest sound you can hear.',
    prompt: 'Describe the quietest, calmest place you can imagine — in full sensory detail.',
    comfort: 'v3',
  },
  spiritual: {
    icon: '🤲', title: 'Need Spiritual Comfort',
    message: 'Turn your heart toward the One who never turns away.',
    breathing: null,
    action: 'Make wudu slowly and mindfully, then sit for two minutes of quiet dhikr.',
    prompt: 'What are you grateful for today, and what do you want to ask for?',
    comfort: 'v4',
  },
};

export const QUOTES = [
  'Small steps every day beat perfect plans once in a while.',
  'You do not have to be perfect. You just have to begin, gently.',
  'Rest is part of the routine, not a break from it.',
  'A glass of water, a deep breath, a kind word to yourself — that is self-care too.',
  'Progress is quiet. Trust the days that feel ordinary.',
  'Be as kind to yourself as you are to everyone else.',
  'Done is better than perfect, and gentle is better than harsh.',
  'Your body is not a project to fix; it is a home to care for.',
  'One page, one prayer, one glass of water at a time.',
  'Tired is not the same as failing. Keep going softly.',
  'Celebrate the 10 minutes you did, not the hour you missed.',
  'Softness is strength that learned patience.',
];

export const HUMOR = [
  'My skincare routine has more steps than my career plan, and honestly both are doing fine.',
  'Drank water today. My plants are jealous of this level of hydration.',
  'I told myself "just 5 more minutes" of rest… that was three naps ago.',
  'My curls have a mind of their own. Today they decided: volume. Always volume.',
  'Adulting level: remembered to eat lunch AND drink water. Unstoppable.',
  'My to-do list and I have agreed to take things one dramatic sigh at a time.',
  'Currently running on chai, good intentions, and dry shampoo.',
  'Plot twist: the "quick 5-minute task" took all afternoon, but at least it is done.',
];

export const FOODS = {
  protein: ['Eggs (ande)', 'Chicken', 'Fish (machli)', 'Lentils (daal: masoor, moong)', 'Chickpeas (kale chane)', 'Kidney beans (rajma)', 'Milk', 'Yogurt (dahi)', 'Paneer', 'Nuts (badam, akhrot)'],
  iron: ['Spinach (palak)', 'Mustard greens (sarson)', 'Lentils (masoor daal)', 'Chickpeas', 'Kidney beans', 'Dates (khajoor)', 'Raisins (kishmish)', 'Jaggery (gur)', 'Chicken liver (occasionally)', 'Pomegranate (anar)'],
  vitC: ['Guava (amrood)', 'Oranges (santre)', 'Kinnow', 'Lemons (nimbu)', 'Amla', 'Tomatoes', 'Green chilies (small amount)'],
  fruits: ['Guava (amrood)', 'Banana (kela)', 'Apple (seb)', 'Orange / Kinnow', 'Papaya (papeeta)', 'Pomegranate (anar)', 'Mango (seasonal)', 'Grapes (angoor)', 'Watermelon (tarbooz, seasonal)'],
  veg: ['Spinach (palak)', 'Fenugreek (methi)', 'Okra (bhindi)', 'Bitter gourd (karela)', 'Cauliflower (phool gobhi)', 'Carrots (gajar)', 'Peas (matar)', 'Bottle gourd (lauki)', 'Cucumber (kheera)'],
  snacks: ['Roasted chickpeas (bhune chane)', 'Peanuts (moong phali)', 'Handful of almonds', 'Fruit chaat', 'Yogurt with fruit', 'Boiled eggs', 'Dates with milk', 'Vegetable soup (shorba)'],
  drinks: ['Milk', 'Lassi (plain)', 'Fresh orange/kinnow juice', 'Lemon water (nimbu pani)', 'Coconut water', 'Milk with dates', 'Green tea (light)'],
};

export const HEALTH_NOTICE =
  'A gentle note: if you often feel very tired, dizzy, or unwell — or if fever keeps coming back — ' +
  'please see a doctor or clinic for proper evaluation. Low hemoglobin and repeated fevers need professional ' +
  'medical care. The food lists here support everyday healthy eating; no single food cures anemia, typhoid, or ' +
  'any illness, and this app never prescribes medicine or supplement doses.';

export const SKIN_AM = [
  { id: 'cleanse', label: 'Gentle cleansing', sub: 'Lukewarm water + mild cleanser' },
  { id: 'moisturize', label: 'Moisturizer', sub: 'If suitable for your skin' },
  { id: 'sunscreen', label: 'Sunscreen', sub: 'When going out in daylight' },
];
export const SKIN_PM = [
  { id: 'cleanse', label: 'Gentle cleansing', sub: 'Wash off the day, softly' },
  { id: 'moisturize', label: 'Moisturizer', sub: 'Night nourishment' },
];
export const HAIR_STEPS = [
  { id: 'detangle', label: 'Gentle detangling', sub: 'Fingers or wide-tooth comb, from ends up' },
  { id: 'wash', label: 'Wash', sub: 'Sulfate-free shampoo, focus on scalp' },
  { id: 'condition', label: 'Conditioner', sub: 'Mid-lengths to ends, a few minutes' },
  { id: 'leavein', label: 'Leave-in (optional)', sub: 'A little goes a long way on curls' },
];
export const GROOM_ITEMS = [
  { id: 'face', label: 'Wash face', sub: 'Fresh and clean' },
  { id: 'hair', label: 'Brush or arrange hair', sub: 'Neat and comfortable' },
  { id: 'clothes', label: 'Clean, comfortable clothes', sub: 'Dress for the day you want' },
  { id: 'hygiene', label: 'Basic hygiene', sub: 'Teeth, deodorant, freshness' },
  { id: 'prep', label: 'Prepare clothes', sub: 'Lay out tomorrow\'s outfit' },
  { id: 'makeup', label: 'Light makeup (optional)', sub: 'Only if you feel like it' },
];

export const MEAL_SUGGESTIONS = {
  breakfast: ['Oatmeal / daliya with milk & dates', 'Eggs (boiled/omelette) + toast', 'Paratha with yogurt', 'Fruit + yogurt bowl', 'Besan cheela'],
  lunch: ['Daal + roti + salad', 'Chicken curry + rice', 'Chana chaat', 'Vegetable pulao + raita', 'Rajma + roti'],
  dinner: ['Light daal + roti', 'Grilled chicken + vegetables', 'Khichdi with yogurt', 'Soup + toast', 'Stir-fried vegetables + rice (small portion)'],
  snacks: ['Fruit', 'Roasted chickpeas', 'Yogurt', 'Handful of nuts', 'Milk'],
};
