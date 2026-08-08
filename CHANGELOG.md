# student-app CHANGELOG

student-app（スキマ君）自身の変更と、student-appの挙動へ直接影響する関連リポジトリの変更を記録します。

確認できた事実だけを記載し、未実施・未確認の項目はその状態を明記します。同一Issueは重複して追加せず、既存項目を更新します。

## Version History

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
