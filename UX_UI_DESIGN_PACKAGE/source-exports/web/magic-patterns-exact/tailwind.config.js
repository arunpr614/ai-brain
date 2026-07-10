
export default {
  theme: {
    extend: {
      colors: {
        // Surfaces & ink — calm, near-white app with deep navy text
        canvas: '#f6f7f9', // near-white app background
        panel: '#ffffff', // white panels
        ink: {
          DEFAULT: '#16213a', // deep ink/navy primary text
          900: '#0f1729',
          800: '#16213a',
          700: '#27324d',
          600: '#465069',
          500: '#6b7385',
          400: '#9aa1b1',
        },
        line: {
          DEFAULT: '#e3e6ec', // crisp borders
          strong: '#cdd2dc',
          soft: '#eef0f4',
        },
        // Prism semantic accents — restrained, tied to labels only
        teal: { 50: '#ecfbf6', 100: '#d2f5ea', 500: '#0fae8a', 600: '#0c8e71', 700: '#0a6f59' }, // saved / full text
        cyan: { 50: '#ecfaff', 100: '#cdf1fd', 500: '#13a4cc', 600: '#0f87aa', 700: '#0c6b87' }, // transcript / reading / web capture
        azure: { 50: '#eef3ff', 100: '#dbe6ff', 500: '#3b6ef0', 600: '#2f57c8', 700: '#24459e' }, // PDF / item detail / this-item scope
        violet: { 50: '#f2eeff', 100: '#e4dcff', 500: '#6d4dee', 600: '#5736d4', 700: '#4429ab' }, // Ask / AI / selected
        magenta: { 50: '#fdeef9', 100: '#fad9f1', 500: '#c43aa0', 600: '#a32a83', 700: '#811f67' }, // collections
        amber: { 50: '#fff7e8', 100: '#ffe9bf', 500: '#d68a09', 600: '#b16f06', 700: '#8c5705' }, // preview only
        coral: { 50: '#fff0ec', 100: '#ffd9cf', 500: '#e35d3f', 600: '#c2462b', 700: '#9c3621' }, // metadata only / capture issues
        ruby: { 50: '#ffeef1', 100: '#ffd4dc', 500: '#dc3858', 600: '#bb2745', 700: '#971c35' }, // needs upgrade / repair
        lime: { 50: '#f1fae6', 100: '#dcf3bf', 500: '#5fa30f', 600: '#4c850a', 700: '#3a6707' }, // updated
      },
      borderRadius: {
        DEFAULT: '6px',
        card: '8px',
        chip: '5px',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 23, 41, 0.04)',
        raised: '0 4px 16px rgba(15, 23, 41, 0.08)',
      },
    },
  },
}
