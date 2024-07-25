module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // ルートの app ディレクトリ
    "./pages/**/*.{js,ts,jsx,tsx,mdx}", // pages ディレクトリ（もし使用している場合）
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // components ディレクトリ
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // src ディレクトリ内のすべてのファイル
    "./*.{js,ts,jsx,tsx,mdx}", // ルートディレクトリの直下のファイル（page.tsx など）
    "./src/sections/**/*.{js,ts,jsx,tsx,mdx}", // この行を追加
  ],
  theme: {
    extend: {
      colors: {
        background: "white",
        // 他の色はそのままにしてください
      },
      textColor: {
        DEFAULT: "#1a202c", // デフォルトのテキストカラー
      },
    },
  },
  plugins: [],
};
