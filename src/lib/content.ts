export type Lang = 'he' | 'en'

export type VehicleAvailability = 'available' | 'soon'

export interface VehicleCopy {
  id: string
  name: string
  description: string
  availability: VehicleAvailability
}

export interface CapabilityCopy {
  id: string
  title: string
  description: string
}

export interface SiteCopy {
  langLabel: string
  langSwitchTo: string
  dir: 'rtl' | 'ltr'
  nav: {
    home: string
    showroom: string
    garage: string
  }
  a11y: {
    open: string
    title: string
    textSize: string
    increase: string
    decrease: string
    highContrast: string
    grayscale: string
    reduceMotion: string
    reset: string
    close: string
    link: string
  }
  launchStudio: string
  menu: string
  hero: {
    eyebrow: string
    headlineLine1: string
    headlineLine2: string
    body: string
    primaryCta: string
    secondaryCta: string
    imageAlt: string
  }
  about: {
    title: string
    intro: string
    benefits: string[]
    flowTitle: string
    flow: string[]
  }
  capabilitiesTitle: string
  capabilities: CapabilityCopy[]
  preview: {
    title: string
    subtitle: string
    availableLabel: string
    soonLabel: string
    cardCta: string
  }
  vehicles: VehicleCopy[]
  closing: {
    headline: string
    body: string
    cta: string
  }
  footer: {
    studentNotice: string
    affiliationNotice: string
    rights: string
  }
}

export const CONTENT: Record<Lang, SiteCopy> = {
  he: {
    langLabel: 'עברית',
    langSwitchTo: 'English',
    dir: 'rtl',
    nav: {
      home: 'בית',
      showroom: 'אולם תצוגה',
      garage: 'Garage',
    },
    a11y: {
      open: 'אפשרויות נגישות',
      title: 'נגישות',
      textSize: 'גודל טקסט',
      increase: 'הגדלת טקסט',
      decrease: 'הקטנת טקסט',
      highContrast: 'ניגודיות גבוהה',
      grayscale: 'גווני אפור',
      reduceMotion: 'הפחתת תנועה',
      reset: 'איפוס הגדרות',
      close: 'סגירה',
      link: 'הצהרת נגישות',
    },
    launchStudio: 'לפתיחת הסטודיו',
    menu: 'תפריט',
    hero: {
      eyebrow: 'סטודיו תלת־ממדי חכם לעיצוב רכבים',
      headlineLine1: 'עיצוב בלי גבולות.',
      headlineLine2: 'דיוק בלי ניחושים.',
      body: 'CarForge AI הוא סטודיו דיגיטלי להתאמה אישית של רכבים, עם תצוגה תלת־ממדית, שליטה מדויקת וחוויית מוסך מקצועית.',
      primaryCta: 'לפתיחת הסטודיו',
      secondaryCta: 'לצפייה באולם התצוגה',
      imageAlt: 'רכב ספורט של CarForge AI עם סריקה תלת־ממדית של המחצית האחורית והלוגו CARFORGE AI',
    },
    about: {
      title: 'מה אפשר לעשות עם CarForge AI?',
      intro:
        'CarForge AI הוא סטודיו דיגיטלי מתקדם להתאמה אישית של רכבים. בוחרים רכב מתוך שלושה דגמים מאושרים, נכנסים לסביבת Garage מקצועית ומבצעים התאמה אישית ויזואלית של מרכיבי חוץ ופנים. המערכת מיועדת להמחשה, חקירה ועיצוב מדויק של הרכב בסביבה דיגיטלית ממוקדת.',
      benefits: [
        'בחירת רכב מתוך שלושה דגמים מאושרים',
        'התאמה אישית של עיצוב חיצוני ופנימי',
        'סביבת Garage ממוקדת ונוחה לעבודה',
        'תצוגה ברורה של השינויים והעיצוב הנוכחי',
      ],
      flowTitle: 'איך זה עובד',
      flow: ['בוחרים רכב', 'נכנסים ל־Garage', 'מתחילים לעצב'],
    },
    capabilitiesTitle: 'היכולות של הסטודיו',
    capabilities: [
      {
        id: 'view3d',
        title: 'תצוגת רכב תלת־ממדית',
        description: 'בחינה אינטראקטיבית של הרכב מכל זווית.',
      },
      {
        id: 'exterior',
        title: 'עיצוב חיצוני',
        description: 'צבעים, חישוקים, ספוילרים, פגושים וגימורים.',
      },
      {
        id: 'interior',
        title: 'עיצוב פנים',
        description: 'מושבים, צבעים, דשבורד, דלתות וגימורים פנימיים.',
      },
      {
        id: 'history',
        title: 'היסטוריית שינויים',
        description: 'ביטול, שחזור והשוואה למצב המקורי.',
      },
    ],
    preview: {
      title: 'אולם התצוגה',
      subtitle: 'בחרו רכב כדי להתחיל לעצב בסביבת ה־Garage.',
      availableLabel: 'זמין לעיצוב',
      soonLabel: 'בקרוב',
      cardCta: 'פתחו ב־Garage',
    },
    vehicles: [
      {
        id: 'bmw-m3',
        name: 'BMW M3',
        description: 'סדאן ביצועים ספורטיבית עם נוכחות חדה וקווים דינמיים.',
        availability: 'available',
      },
      {
        id: 'byd-seal',
        name: 'BYD Seal',
        description: 'סדאן חשמלית עתידנית בעיצוב נקי, מודרני ואווירודינמי.',
        availability: 'available',
      },
      {
        id: 'porsche-gt3rs',
        name: 'Porsche Manthey 911 GT3 RS',
        description: 'מכונית מסלול אגרסיבית עם אופי טכני וביצועים קיצוניים.',
        availability: 'available',
      },
    ],
    closing: {
      headline: 'מוכנים להתחיל לעצב?',
      body: 'בחרו רכב, פתחו את סביבת ה־Garage והתחילו לבנות את העיצוב שלכם.',
      cta: 'לאולם התצוגה',
    },
    footer: {
      studentNotice: 'CarForge AI הוא פרויקט לימודי והדגמתי.',
      affiliationNotice:
        'הפרויקט אינו קשור, מאושר או נתמך על ידי BMW, BYD, Porsche או יצרן רכב אחר.',
      rights: 'CarForge AI',
    },
  },
  en: {
    langLabel: 'English',
    langSwitchTo: 'עברית',
    dir: 'ltr',
    nav: {
      home: 'Home',
      showroom: 'Showroom',
      garage: 'Garage',
    },
    a11y: {
      open: 'Accessibility options',
      title: 'Accessibility',
      textSize: 'Text size',
      increase: 'Increase text',
      decrease: 'Decrease text',
      highContrast: 'High contrast',
      grayscale: 'Grayscale',
      reduceMotion: 'Reduce motion',
      reset: 'Reset settings',
      close: 'Close',
      link: 'Accessibility statement',
    },
    launchStudio: 'Launch Studio',
    menu: 'Menu',
    hero: {
      eyebrow: 'AI-powered 3D car design studio',
      headlineLine1: 'Design without limits.',
      headlineLine2: 'Precision without guesswork.',
      body: 'CarForge AI is a digital studio for personalizing cars, with 3D visualization, precise control and a professional garage experience.',
      primaryCta: 'Launch Studio',
      secondaryCta: 'View Showroom',
      imageAlt: 'CarForge AI sports car with a 3D scan of its rear half and the CARFORGE AI wordmark',
    },
    about: {
      title: 'What can you do with CarForge AI?',
      intro:
        'CarForge AI is an advanced digital studio for personalizing vehicles. Choose one of three approved cars, step into a professional Garage environment and visually customize both exterior and interior areas. The experience is built for visualization, exploration and precise refinement in a focused digital space.',
      benefits: [
        'Choose a car from three approved models',
        'Customize both exterior and interior design',
        'A focused, comfortable Garage workspace',
        'A clear view of your changes and current design',
      ],
      flowTitle: 'How it works',
      flow: ['Pick a car', 'Enter the Garage', 'Start designing'],
    },
    capabilitiesTitle: 'What the studio does',
    capabilities: [
      {
        id: 'view3d',
        title: '3D vehicle view',
        description: 'Explore the car interactively from every angle.',
      },
      {
        id: 'exterior',
        title: 'Exterior design',
        description: 'Colors, wheels, spoilers, bumpers and finishes.',
      },
      {
        id: 'interior',
        title: 'Interior design',
        description: 'Seats, colors, dashboard, doors and inner finishes.',
      },
      {
        id: 'history',
        title: 'Change history',
        description: 'Undo, restore and compare against the original state.',
      },
    ],
    preview: {
      title: 'Showroom',
      subtitle: 'Pick a car to start designing in the Garage.',
      availableLabel: 'Ready to design',
      soonLabel: 'Coming soon',
      cardCta: 'Open in Garage',
    },
    vehicles: [
      {
        id: 'bmw-m3',
        name: 'BMW M3',
        description: 'A sporty performance sedan with sharp presence and dynamic lines.',
        availability: 'available',
      },
      {
        id: 'byd-seal',
        name: 'BYD Seal',
        description: 'A futuristic electric sedan with a clean, modern and aerodynamic design.',
        availability: 'available',
      },
      {
        id: 'porsche-gt3rs',
        name: 'Porsche Manthey 911 GT3 RS',
        description: 'An aggressive track car with a technical character and extreme performance.',
        availability: 'available',
      },
    ],
    closing: {
      headline: 'Ready to start designing?',
      body: 'Pick a car, open the Garage environment and start building your design.',
      cta: 'View Showroom',
    },
    footer: {
      studentNotice: 'CarForge AI is a student and demonstration project.',
      affiliationNotice:
        'This project is not affiliated with, endorsed or sponsored by BMW, BYD, Porsche or any other car manufacturer.',
      rights: 'CarForge AI',
    },
  },
}
