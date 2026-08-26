# student-app CHANGELOG

student-app（スキマ君）自身の変更と、student-appの挙動へ直接影響する関連リポジトリの変更を記録します。

確認できた事実だけを記載し、未実施・未確認の項目はその状態を明記します。同一Issueは重複して追加せず、既存項目を更新します。

## Version History

### Version 4.3.0

- Previous Version: 4.2.1
- Date: 2026-08-26
- Issue: 前置詞テスト追加（Issue番号未指定）
- Changes: 前置詞44項目の双方向テスト、方向別復習、固定IDログを追加
- Display: ログイン画面とログイン後メニューの右下へ共通定数からVersionを表示

### Version 4.2.1

- Previous Version: 4.2.0
- Date: 2026-08-08
- Issue: Issue #005
- Changes: 合宿コンテンツ3件を権限管理対象へ追加したIssue完了に伴い、アプリVersionを更新
- Display: ログイン画面とログイン後メニューの右下へ共通定数からVersionを表示

### 関連リリース（gyoumu-app Version未確認）

- Version: student-app独自Versionなし。gyoumu-app側Versionは未確認
- 日付: 2026-08-08（初期履歴登録日）
- テーマ: ログイン権限、初回パスワード変更、合宿コンテンツ権限の連携
- 含まれるIssue: Issue #001、Issue #004、Issue #005
- 主な変更: 生徒別コンテンツ権限の反映、studentの初回パスワード変更画面の回避、合宿コンテンツ権限との連携
- student-app Frontend影響: Issue #001とIssue #004はReact変更あり。Issue #005は既存の合宿コンテンツ定義・表示判定を利用
- GAS依存変更: `login`、`validateToken`、`isInitial`、コンテンツマスターの応答仕様に依存。GASソースと関連コミットはこのリポジトリでは未確認
- コンテンツ／CSV影響: 合宿コンテンツ本体と3つのCSVはコミット `a4c7f84` で追加済み。Issue #005による追加のstudent-appコード／CSV変更はなし
- Gemini影響: Issue #001、Issue #004、Issue #005による変更は確認されていない
- gyoumu-app連携影響: 通常ログイン、SSO、初回パスワード判定、`allowedContentIds` による合宿モード表示がgyoumu-app/GAS側仕様に依存

## Issue History

### 前置詞テスト追加（Issue番号未指定）

- 状態: React実装・CSV追加・自動テスト・build・ローカル起動確認完了。認証後画面、通常ログイン、SSO、ログGAS実保存、本番確認は未実施
- 変更内容:
  - メインコンテンツへ権限管理対象の「前置詞テスト」を追加
  - 日本語→英語／英語→日本語の2方向を選択し、CSV全44項目から重複なしでランダム20問を出題
  - 英語は大小文字・前後空白・連続空白を正規化し、`in to` と `into` は区別
  - 日本語は登録済みの複数意味のいずれか1つを正解とし、波線・長音・ハイフン・区切り記号・空白を限定的に正規化
  - 固定語彙のためGeminiを呼ばず、Reactの決定的文字列判定を使用
  - `preposition_test::prep_*__en_ja` / `preposition_test::prep_*__ja_en` の方向別固定キーで復習対象を分離
  - 既存の `getLogs`、`saveLog`、要復習抽出、復習正解 `◎` を流用し、復習正解後は該当方向のみ対象から除外
  - 既存クイズの問題画面、回答入力、即時判定、誤答練習、結果一覧を流用
  - 前置詞ログのみ既存payloadへ `answerDetails` を追加し、問題ID・問題・回答・正解・正誤を送信
- CSV影響:
  - 変更前: 前置詞CSVなし
  - 変更後: `public/prepositions.csv` を追加（`id`,`English`,`日本語` の3列、指定表の全44行、ID・英語とも重複なし）
  - 既存データへの影響: 既存CSVの列・内容は変更なし。新規IDは表示順やランダム順に依存しない固定値として維持が必要
  - 正式仕様は前置詞44項目。CSV行数、固定ID数、英語項目数がすべて44件であることを確認
- Gemini影響: 呼び出しなし。既存英語・理科・社会のGemini判定条件は変更なし。外部Gemini API実通信なし
- GAS影響: このリポジトリにGASソースがないため変更なし。既存 `getLogs` / `saveLog` を利用。`answerDetails` の永続化はログGAS側の受入・保存対応が必要で、実保存は未確認
- build結果: 2026-08-26 `npm run build` 成功
- lint結果: 2026-08-26 新規4ファイルの対象lint成功。全体lintは既存8件（`App.jsx` 6件、`ChemistryPlayView.jsx` 2件）で失敗し、今回追加コードの新規エラーなし
- test結果: 2026-08-26 main基点の専用ブランチで `npm test` 成功（19件。英語／日本語正規化、複数意味、方向別固定ID、20問上限、復習解消、既存復習互換を含む）
- `git diff --check`: 2026-08-26 成功
- ローカル確認: Vite起動、ログイン画面描画、エラーオーバーレイなし、console errorなしを確認。Version 4.3.0への更新後確認と認証後の前置詞画面は未確認
- 通常ログイン: 未実施
- SSO: 未実施
- Gemini: 実通信未実施
- Commit: `feat: add preposition test`（本コミット）
- Push: 未実施
- mainマージ: 未実施
- Vercelデプロイ: 未実施
- 本番確認: 未実施
- Version: 4.2.1から4.3.0へ更新。共通定数を利用するログイン画面・ログイン後メニューが対象
- 関連gyoumu-appコミット / Issue: なし。gyoumu-app変更なし

### S-009 問題ジャンル選択UI改善

- 理科・社会ジャンル選択UIを改善。
- チェックボックスと問題ジャンルのレイアウトを共通化し、レスポンシブ対応した。

### S-007 合宿コンテンツ 復習機能・複数分野選択対応

- 状態: レビュー済み実装として完了。実装・test・build完了。ブラウザ確認、通常ログイン、SSO、本番確認は未実施
- 変更内容:
  - 合宿の漢字・理科・社会へ、既存ログから要復習問題を取得して一覧表示し、「間違えた問題のみトライ」できる導線を追加
  - 合宿では履歴中に一度でも不正解がある問題を復習対象として保持し、復習後に正解しても自動削除しない仕様を追加
  - 復習対象が0件の場合は「現在、間違えた問題はありません。」と表示
  - 理科の問題ジャンルをチェックボックスによる複数選択へ変更
  - 社会の歴史／地理配下の分野をチェックボックスによる複数選択へ変更
  - 理科・社会へ全選択・全解除を追加し、未選択で開始した場合は「最低1件選択してください。」と表示
  - 選択した複数分野の問題をまとめてランダム出題
  - 合宿3コンテンツの復習識別を問題文から `contentId::questionId` の固定キーへ変更
  - 新規ログには問題文を保存せず固定キーを保存し、一覧表示時にCSVの現在の問題文・解答を参照
  - 問題文形式の既存ログは、CSV文言が一致する間は後方互換で読込
- 再利用した既存実装: `getLogs` による履歴取得、`saveLog` による採点後保存、要復習一覧UI、既存手書き入力、理科・社会のReact一次判定と `checkAnswersWithGemini` 一括判定
- 保存方式: 既存のGASログシートと `history` を継続利用。合宿の新規履歴は `contentId::questionId` を保存する。localStorage、復習専用CSV、削除処理の追加なし
- CSV影響:
  - 変更前: 合宿漢字4列、理科3列、社会4列。固定問題IDなし
  - 変更後: 各CSVの先頭へ `id` 列を追加し、行番号・問題文に依存しない固定の不透明IDを全3,655問へ付与
  - 既存データへの影響: ID列以外の全フィールドが変更前と完全一致することを確認。今後は既存行のIDを維持する必要があり、ID変更・再採番・再利用は禁止
- Gemini影響: 採点ロジック、React一次判定、一括判定方式、Gemini呼び出し条件は変更なし。外部Gemini API実通信なし
- GAS影響: GASソース変更なし。既存 `getLogs` と `saveLog` を再利用し、合宿ログの `history` 値だけを固定キー形式へ変更
- build結果: 2026-08-09 `npm run build` 成功
- lint結果: 2026-08-09 `npm run lint` は既存8件で失敗（`App.jsx` 6件、`ChemistryPlayView.jsx` 2件）。今回変更箇所の新規lintエラーなし
- test結果: 2026-08-09 `npm test` 成功（13件。固定キー保存、questionId欠落時の拒否、既存ログ互換、通常コンテンツ互換を含む）
- `git diff --check`: 2026-08-09 成功
- ローカル確認: ブラウザ確認未実施
- 通常ログイン: 未確認
- SSO: 未確認
- Gemini: 実通信未実施
- Commit: `feat: add camp review mode and multi-category selection`（本コミット）
- Push: 2026-08-09 `feature/s-007-camp-review` をGitHubへpush
- mainマージ: 未実施
- Vercelデプロイ: 2026-08-09 Git連携によるPreviewデプロイ成功（READY）。本番デプロイ未実施
- 本番確認: 未実施
- Version: 変更なし（現在Version 4.2.1）
- 関連gyoumu-appコミット / Issue: なし。gyoumu-app変更なし

### S-008 既存ログMigration（Issue候補）

- 状態: 未着手。設計メモのみ。S-007では実装しない
- 目的: 既存の問題文形式ログを `contentId::questionId` 方式へ一括変換し、問題文依存を完全に廃止する
- 実施条件: デプロイ前またはCSV文言変更前に一度だけ実施するMigration
- 背景: S-007以降の新規ログは固定キー方式だが、既存の問題文形式ログはCSV文言が一致する間だけ後方互換で照合できる
- コード変更: 未実施
- GAS変更・本番データ変更: 未実施
- Commit / Push / Vercelデプロイ: 未実施
- Version: 未確定。変更なし

### S-006B Gemini採点基盤（429/503 Retry）

- 状態: 完了。教室で12台同時利用試験を実施し、11台成功、1台は通信エラー。エラー端末ではGemini診断コードを取得できず、Gemini Retry対象とは確認できなかった。現時点では運用可能と判断し、監視を継続
- 背景: 教室で5人同時利用時、Gemini一括採点で `GEMINI_UNAVAILABLE` を確認。一時的な503へ耐えられるようRetryを追加
- 変更内容:
  - 429と503のみを対象とする自動Retryを追加
  - `Retry-After` に対応
  - 指数バックオフとjitterを追加
  - Retry中も同一の `requestId` を維持
  - 診断ログを強化
  - `durationMs` と `totalDurationMs` を追加
- CSV影響: なし
- Gemini影響: 429・503発生時のみ自動Retryを実施。その他のエラーはRetry対象外
- GAS影響: Gemini一括採点の429・503 Retryおよび診断情報を変更
- build結果: S-006B完了時の結果は未記載
- lint結果: S-006B完了時の結果は未記載
- ローカル確認: 未確認
- 通常ログイン: 未確認
- SSO: 未確認
- Gemini: 12台同時利用試験で11台成功。1台は通信エラーだったがGemini診断コードを取得できず、Gemini Retry対象とは未確認
- Commit: `docs: record S-006B completion`（本コミット）
- Push: `main` へ本コミットをpush
- mainマージ: 未確認
- Vercelデプロイ: 未確認
- 本番確認: 教室で12台同時利用試験を実施。現時点では運用可能と判断し、監視を継続
- Version: 変更なし
- 関連gyoumu-appコミット / Issue: 未確認

### S-006A Gemini採点基盤（診断）

- 状態: student-app側のReact診断実装・純粋関数テスト・build完了。GAS側診断基盤はgyoumu-appの `feature/g-008-gemini-diagnostics` で実装済み（この作業では未検証）。実通信、ローカル画面確認、本番確認は未実施
- 変更内容:
  - 理科・社会の `checkAnswersWithGemini` 1回ごとに個人情報を含まない `requestId` を生成し、GASリクエストへ追加
  - GASから返る `GEMINI_RATE_LIMIT`、`GEMINI_UNAVAILABLE`、`GEMINI_HTTP_ERROR`、`GEMINI_JSON_PARSE_ERROR`、`GEMINI_INVALID_RESPONSE`、`GEMINI_TIMEOUT_OR_DELAY`、`INTERNAL_ERROR` を保持
  - Axios timeoutを `CLIENT_TIMEOUT`、レスポンス未受信の通信失敗を `NETWORK_ERROR` として分類
  - index欠落・重複・範囲外、boolean不正、件数不一致を `GEMINI_INVALID_RESPONSE` として不正解扱いにせず採点処理を停止
  - 原因別の安全なメッセージ、エラーコード、requestIdを表示。採点失敗時の回答保持と再試行可能状態を維持
  - 429、503、その他HTTPエラー、不正JSON、index欠落・重複、boolean不正、正常レスポンス、client timeout、network failureの純粋関数テストを追加
- CSV影響: なし。列構成・データ変更なし
- Gemini影響: 呼び出し回数・一括判定方式・90秒の既存timeout値は変更なし。外部Gemini API実通信なし
- GAS影響: このリポジトリにGASソースがないため未変更。gyoumu-appの `feature/g-008-gemini-diagnostics` にGAS診断基盤を実装済みとの利用者確認あり。この作業ではGAS差分・連携動作は未検証
- build結果: 2026-08-09 `npm run build` 成功
- lint結果: 2026-08-09 `npm run lint` は既存8件で失敗（`App.jsx` 6件、`ChemistryPlayView.jsx` 2件）。今回追加コードの新規lintエラーなし
- test結果: 2026-08-09 `npm test` 成功
- `git diff --check`: 2026-08-09 成功
- ローカル確認: ブラウザ確認未実施
- 通常ログイン: 未確認
- SSO: 未確認
- Gemini: 実通信未実施
- Commit: `feat: add Gemini grading diagnostics`（本コミット）
- Push: 未実施
- mainマージ: 未実施
- Vercelデプロイ: 未実施。Vercel読み取り監査では既存main最新本番デプロイがREADY
- 本番確認: 未実施
- 関連gyoumu-appコミット / Issue: `feature/g-008-gemini-diagnostics` / G-008（コミットID未確認。この作業によるgyoumu-app変更なし）

### Issue #001 スキマ君利用権限管理の改善

- 状態: student-app React変更は実装済み。GAS側実装・実通信はこのリポジトリでは未確認
- 変更内容:
  - 通常ログイン時に `allowedContentIds` と `permissionsInitialized` を受け取る処理を追加
  - 通常ログインと `validateToken` で共通の権限状態適用処理を利用
  - 権限未設定時に従来どおり全コンテンツを許可する通常ログイン用フォールバックを維持
  - メニュー表示とコンテンツ開始時の権限制御を追加
- build結果: 現在の `main` での確認結果は下記「Verification」を参照
- lint結果: 現在の `main` での確認結果は下記「Verification」を参照
- ローカル確認: ブラウザでの通常ログイン／SSO確認は未確認
- 本番確認: 未確認
- Commit: `ff262f1` (`feat: apply per-student Sukimakun content permissions`)
- Vercelデプロイ: 未確認
- Related repository: gyoumu-app
- Related Issue: Issue #001
- Related change: GAS `login` / `validateToken` の権限応答仕様。GAS側コミットは未確認

### Issue #004 初回パスワード変更対象をstaff限定へ変更

- 状態: student-app React変更は実装済み。GAS正式仕様との実通信確認は未確認
- 変更内容:
  - `admin`、`teacher`、`head-teacher` のstaff roleだけを初回パスワード変更対象とする防御条件を追加
  - studentは `isInitial === true` でも初回パスワード変更画面へ遷移せず、通常のコンテンツ読込へ進むよう変更
  - 通常ログイン処理をGAS側のrole／`isInitial` 仕様に接続
- build結果: 現在の `main` での確認結果は下記「Verification」を参照
- lint結果: 現在の `main` での確認結果は下記「Verification」を参照
- ローカル確認: ブラウザでのstaff／studentログイン確認は未確認
- 本番確認: 未確認
- Commit: `8a035fa` (`fix: skip initial password change for students`)
- Vercelデプロイ: 未確認
- Related repository: gyoumu-app
- Related Issue: Issue #004
- Related change: GAS `login` の `isInitial` / `role` 応答仕様変更。gyoumu-app側コミットは未確認

### Issue #005 合宿コンテンツ権限追加

- 状態: student-appへの関連影響として登録。Issue #005によるstudent-appコード変更はなし
- 変更内容:
  - 既存定義 `camp_kagawa_kanji`、`camp_science_qa`、`camp_social_qa` を利用
  - 上記IDが `allowedContentIds` に1件以上含まれる場合に既存の合宿モードを表示
  - GAS／コンテンツマスター24件化後の表示確認対象として記録
- build結果: Issue #005固有のstudent-app変更がないため対象外。現在の `main` の確認結果は下記「Verification」を参照
- lint結果: Issue #005固有のstudent-app変更がないため対象外。現在の `main` の確認結果は下記「Verification」を参照
- ローカル確認: GAS／コンテンツマスター24件化後の表示確認は未確認
- 本番確認: 未確認
- Commit: Issue #005固有のstudent-appコミットなし。合宿コンテンツ本体の既存コミットは `a4c7f84` (`feat: add camp quiz content`)
- Vercelデプロイ: 未確認
- Related repository: gyoumu-app
- Related Issue: Issue #005
- Related change: GAS／コンテンツマスターへの合宿コンテンツ権限3件追加。gyoumu-app側コミットは未確認

## Verification

- build: 2026-08-08、`npm run build` 成功
- lint: 2026-08-08、`npm run lint` は既存8件のエラーで失敗。`App.jsx` の不要なエスケープ4件・未使用変数2件、`ChemistryPlayView.jsx` のFast Refresh制約1件・effect内setState 1件。今回の文書変更による追加lintエラーなし
- ローカル確認: 文書変更のみ。アプリのブラウザ確認は未実施
- 本番確認: 未実施
- Markdown構造: 2026-08-08、見出し階層とIssue #001／#004／#005の存在を確認
- `git diff --check`: 2026-08-08、成功
