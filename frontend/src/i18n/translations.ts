export const translations = {
  en: {
    dashboard: "Overview", farms: "My farms", scanner: "Leaf scanner", history: "Scan history",
    diseases: "Disease library", weather: "Weather", analytics: "Analytics", notifications: "Notifications",
    settings: "Settings", help: "Help & about", greeting: "Good morning", scans: "Total scans",
    healthy: "Healthy results", disease: "Disease detections", uncertain: "Needs review",
    scanNow: "Analyze a leaf", noScans: "Your scan history starts here", search: "Search",
    demo: "AI model unavailable — demo mode is active.",
    demoDetails: "Your image is stored with your scan history, but no disease prediction was generated. Configure compatible weights to enable classification.",
    uncertainty: "Uncertain — expert verification recommended.",
    safety: "Educational decision support only. This is not a confirmed diagnosis or pesticide recommendation.",
  },
  hi: {
    dashboard: "अवलोकन", farms: "मेरे खेत", scanner: "पत्ती स्कैनर", history: "स्कैन इतिहास",
    diseases: "रोग जानकारी", weather: "मौसम", analytics: "विश्लेषण", notifications: "सूचनाएँ",
    settings: "सेटिंग्स", help: "सहायता और जानकारी", greeting: "नमस्ते", scans: "कुल स्कैन",
    healthy: "स्वस्थ परिणाम", disease: "रोग पहचान", uncertain: "समीक्षा आवश्यक",
    scanNow: "पत्ती का विश्लेषण करें", noScans: "आपका स्कैन इतिहास यहाँ दिखेगा", search: "खोजें",
    demo: "AI मॉडल उपलब्ध नहीं — डेमो मोड सक्रिय है।",
    demoDetails: "आपकी छवि स्कैन इतिहास में सुरक्षित है, लेकिन रोग का कोई अनुमान नहीं बनाया गया। वर्गीकरण के लिए संगत मॉडल वेट्स कॉन्फ़िगर करें।",
    uncertainty: "अनिश्चित — विशेषज्ञ से सत्यापन की सलाह है।",
    safety: "केवल शैक्षिक निर्णय सहायता। यह पुष्ट निदान या कीटनाशक की सिफ़ारिश नहीं है।",
  },
  mr: {
    dashboard: "आढावा", farms: "माझी शेते", scanner: "पान स्कॅनर", history: "स्कॅन इतिहास",
    diseases: "रोग माहिती", weather: "हवामान", analytics: "विश्लेषण", notifications: "सूचना",
    settings: "सेटिंग्ज", help: "मदत आणि माहिती", greeting: "नमस्कार", scans: "एकूण स्कॅन",
    healthy: "निरोगी निष्कर्ष", disease: "रोग ओळख", uncertain: "पुनरावलोकन आवश्यक",
    scanNow: "पानाचे विश्लेषण करा", noScans: "तुमचा स्कॅन इतिहास येथे दिसेल", search: "शोधा",
    demo: "AI मॉडेल उपलब्ध नाही — डेमो मोड सुरू आहे.",
    demoDetails: "तुमची प्रतिमा स्कॅन इतिहासात जतन केली आहे, पण रोगाचा अंदाज तयार केलेला नाही. वर्गीकरणासाठी सुसंगत मॉडेल वजन कॉन्फिगर करा.",
    uncertainty: "अनिश्चित — तज्ज्ञांकडून पडताळणी करण्याची शिफारस आहे.",
    safety: "फक्त शैक्षणिक निर्णय सहाय्य. हे निश्चित निदान किंवा कीटकनाशकाची शिफारस नाही.",
  },
} as const;

export type Language = keyof typeof translations;
