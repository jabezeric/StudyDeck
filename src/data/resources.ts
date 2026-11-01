export type SeededResource = {
  name: string
  url: string
  category: string
  note: string
}

export const CATEGORIES = [
  'All',
  'Math',
  'Science',
  'Programming',
  'Cyber security',
  'Exam prep',
  'Research',
] as const

/** Free, no-paywall-where-possible sites worth knowing about. */
export const RESOURCES: SeededResource[] = [
  {
    name: 'Khan Academy',
    url: 'https://www.khanacademy.org',
    category: 'Exam prep',
    note: 'Full courses from arithmetic to calculus and physics, with exercises and mastery tracking.',
  },
  {
    name: "Paul's Online Math Notes",
    url: 'https://tutorial.math.lamar.edu',
    category: 'Math',
    note: 'The clearest algebra, trig, calculus and differential equations notes on the internet.',
  },
  {
    name: 'Desmos Graphing Calculator',
    url: 'https://www.desmos.com/calculator',
    category: 'Math',
    note: 'Plot functions instantly — the fastest way to build intuition for graphs.',
  },
  {
    name: 'GeoGebra',
    url: 'https://www.geogebra.org',
    category: 'Math',
    note: 'Geometry, algebra and 3D visualisation tools, free for students.',
  },
  {
    name: 'Wolfram Alpha',
    url: 'https://www.wolframalpha.com',
    category: 'Math',
    note: 'Step-by-step answers for algebra, calculus, units and data. Show the steps, not just the answer.',
  },
  {
    name: 'Symbolab',
    url: 'https://www.symbolab.com',
    category: 'Math',
    note: 'Equation solver with worked steps for algebra, calculus and matrices.',
  },
  {
    name: 'OpenStax',
    url: 'https://openstax.org',
    category: 'Exam prep',
    note: 'Free peer-reviewed textbooks for maths, physics, chemistry, biology and economics.',
  },
  {
    name: 'MIT OpenCourseWare',
    url: 'https://ocw.mit.edu',
    category: 'Exam prep',
    note: 'Real university lecture notes, problem sets and exams — free to work through.',
  },
  {
    name: 'PhET Interactive Simulations',
    url: 'https://phet.colorado.edu',
    category: 'Science',
    note: 'Virtual physics, chemistry, biology and maths labs you can run in the browser.',
  },
  {
    name: 'Chemistry LibreTexts',
    url: 'https://chem.libretexts.org',
    category: 'Science',
    note: 'Open chemistry textbook with worked examples from high school to university level.',
  },
  {
    name: 'The Physics Classroom',
    url: 'https://www.physicsclassroom.com',
    category: 'Science',
    note: 'Concept explanations, tutorials and practice problems written for students.',
  },
  {
    name: 'NASA Science',
    url: 'https://science.nasa.gov',
    category: 'Science',
    note: 'Primary-source data, images and mission explainers for astronomy and earth science.',
  },
  {
    name: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org',
    category: 'Programming',
    note: 'Free certifications with an in-browser editor — the easiest place to start coding.',
  },
  {
    name: 'CS50 (Harvard)',
    url: 'https://cs50.harvard.edu/x',
    category: 'Programming',
    note: 'The famous intro to computer science: lectures, problem sets, and a real community.',
  },
  {
    name: 'The Odin Project',
    url: 'https://www.theodinproject.com',
    category: 'Programming',
    note: 'Project-driven full-stack web development curriculum, completely free.',
  },
  {
    name: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    category: 'Programming',
    note: 'The reference for HTML, CSS and JavaScript — use it instead of guessing.',
  },
  {
    name: 'Exercism',
    url: 'https://exercism.org',
    category: 'Programming',
    note: 'Small language exercises with human mentoring in 60+ languages.',
  },
  {
    name: 'Python Documentation',
    url: 'https://docs.python.org/3',
    category: 'Programming',
    note: 'Official tutorial and library reference. Reading docs is itself a skill.',
  },
  {
    name: 'TryHackMe',
    url: 'https://tryhackme.com',
    category: 'Cyber security',
    note: 'Guided, browser-based rooms that teach security fundamentals from zero.',
  },
  {
    name: 'PortSwigger Web Security Academy',
    url: 'https://portswigger.net/web-security',
    category: 'Cyber security',
    note: 'Free labs on SQL injection, XSS, auth flaws — the best practical web-security training.',
  },
  {
    name: 'OverTheWire',
    url: 'https://overthewire.org/wargames',
    category: 'Cyber security',
    note: 'Wargames that teach Linux and shell skills through puzzles over SSH.',
  },
  {
    name: 'picoCTF',
    url: 'https://picoctf.org',
    category: 'Cyber security',
    note: 'Beginner-friendly capture-the-flag challenges built for students.',
  },
  {
    name: 'OWASP',
    url: 'https://owasp.org',
    category: 'Cyber security',
    note: 'The Top 10 and the projects that define how web applications get secured.',
  },
  {
    name: 'CryptoHack',
    url: 'https://cryptohack.org',
    category: 'Cyber security',
    note: 'Learn cryptography by breaking it, challenge by challenge.',
  },
  {
    name: 'Quizlet',
    url: 'https://quizlet.com',
    category: 'Exam prep',
    note: 'Spaced-repetition flashcards; good for quick recall drills before a test.',
  },
  {
    name: 'Anki',
    url: 'https://apps.ankiweb.net',
    category: 'Exam prep',
    note: 'The gold standard for spaced repetition. Free on desktop and Android.',
  },
  {
    name: 'Schoolhouse.world',
    url: 'https://schoolhouse.world',
    category: 'Exam prep',
    note: 'Free live small-group tutoring from volunteer tutors.',
  },
  {
    name: 'Khanmigo',
    url: 'https://www.khanmigo.ai',
    category: 'Exam prep',
    note: "Khan Academy's AI tutor — guides you to the answer instead of handing it over.",
  },
  {
    name: 'Google Scholar',
    url: 'https://scholar.google.com',
    category: 'Research',
    note: 'Search papers and see who cited them. Start here for any research task.',
  },
  {
    name: 'arXiv',
    url: 'https://arxiv.org',
    category: 'Research',
    note: 'Open preprints in physics, maths, computer science and more.',
  },
  {
    name: 'Internet Archive',
    url: 'https://archive.org',
    category: 'Research',
    note: 'Out-of-copyright books, old websites and audio — useful primary sources.',
  },
  {
    name: 'OER Commons',
    url: 'https://oercommons.org',
    category: 'Research',
    note: 'Searchable library of openly licensed teaching material.',
  },
]

export type StudyTool = {
  name: string
  url: string
  tag: string
  blurb: string
}

/** AI tutors and virtual labs that run in the browser. */
export const TOOLS: StudyTool[] = [
  {
    name: 'MathGPT',
    url: 'https://math-gpt.org',
    tag: 'AI tutor',
    blurb: 'Photograph or type a maths problem and get a step-by-step walkthrough.',
  },
  {
    name: 'MathGPTPro',
    url: 'https://www.mathgptpro.com',
    tag: 'AI tutor',
    blurb: 'Advanced solver for calculus, algebra, physics and engineering problems.',
  },
  {
    name: 'Wolfram Alpha',
    url: 'https://www.wolframalpha.com',
    tag: 'Solver',
    blurb: 'Computes exact answers and shows the reasoning for most school-level problems.',
  },
  {
    name: 'PhET Sims',
    url: 'https://phet.colorado.edu/en/simulations/browse',
    tag: 'Virtual lab',
    blurb: 'Physics, chemistry and maths simulations — forces, circuits, pH, waves and more.',
  },
  {
    name: 'Chemix',
    url: 'https://chemix.org',
    tag: 'Virtual lab',
    blurb: 'Draw and label chemistry apparatus diagrams for lab reports.',
  },
  {
    name: 'Physics Aviary',
    url: 'https://www.thephysicsaviary.com',
    tag: 'Virtual lab',
    blurb: 'Interactive physics experiments with data you can actually collect and plot.',
  },
  {
    name: 'Falstad Circuit Simulator',
    url: 'https://www.falstad.com/circuit',
    tag: 'Virtual lab',
    blurb: 'Build circuits in the browser and watch current flow live. Great for electronics.',
  },
  {
    name: 'GeoGebra 3D',
    url: 'https://www.geogebra.org/3d',
    tag: 'Visualiser',
    blurb: 'Rotate surfaces and solids in 3D to make calculus and vectors click.',
  },
]
