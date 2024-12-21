module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  important: true, // This ensures Tailwind classes override Ant Design styles
  corePlugins: {
    preflight: false, // This prevents Tailwind from overriding Ant Design base styles
  },
}
