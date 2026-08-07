# React + Vite

## 合宿コンテンツのCSV

`public` 配下の次のファイルを差し替えると、トップ画面の「合宿」から利用できます。

| コンテンツ | ファイル | 必須カラム | 任意カラム |
| --- | --- | --- | --- |
| 香川県 覚えるべき漢字（書きver.） | `camp-kagawa-kanji.csv` | `学年`, `対象の漢字`, `問題`, `答え` | なし |
| 理科 一問一答 | `camp-science.csv` | `時代`, `問題内容`, `答え` | なし |
| 社会 一問一答 | `camp-social.csv` | `歴史or地理`, `分野`, `問題`, `解答` | なし |

- UTF-8（BOMあり／なしのどちらも可）のCSVを使用してください。
- `問題` は画面に表示する文、`解答` は正解として扱う語句です。
- 漢字の `答え` は手書き認識結果と照合する漢字を入れてください。
- 合宿漢字は全問題からランダムで20問を出題します。
- 社会は「歴史／地理」を選んだあとに「分野」を選択し、理科は「問題ジャンル」を選択して出題します。
- 理科・社会は文字の正規化後に一致しなかった場合、既存のGemini判定APIで表記揺れ・類似表現を判定します。
- 空欄の必須カラムを含む行は読み飛ばします。

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
