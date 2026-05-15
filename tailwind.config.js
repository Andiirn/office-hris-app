/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#000666',
        'primary-container': '#1a237e',
        'on-primary-container': '#8690ee',
        background: '#fbf9f8',
        surface: '#ffffff',
        'text-muted': '#454652',
        outline: '#767683',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        'secondary-container': '#d9e6da',
        'on-secondary-container': '#5b675e',
      },
      fontFamily: {
        inter: ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
        manrope: ["Manrope_400Regular"],
        "manrope-bold": ["Manrope_700Bold"],
        "manrope-extrabold": ["Manrope_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
