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

### ④ Gemini単問採点の安定化・ローカル実装（Issue番号未指定）

- 日付: 2026-10-28
- 状態: 独立worktreeで実装・自動検証完了。利用者によるローカルモックのPC操作8項目が合格し、単問10秒timeoutを利用者が正式採用。利用者からcommit・通常push・PR・チェック/Preview確認後の通常Merge commit・Vercel自動Production反映確認まで承認済み。以下のリリース実施状況は本コミット作成時点の記録。
- 基準: GitHub mainのA・B・C統合済み `13f28a0ab339d2735ccd877ea51e9277bfae29fd`。branch `codex/fix-single-gemini-stability-local-20261028`。元mainとorigin/mainは715f47dのまま変更せず、新規worktreeへ分離。旧④worktreeの未コミット差分は読み取り専用で保全。
- 変更内容: 単問の通信失敗・採点不能をfalseへ変換しない。入力・問題番号・既回答を保持し、回答確定・誤答履歴・保存へ進まない。既存の一次判定・呼出条件を維持し、正常なfalseは不正解として確定する。
- 応答契約: 取得済み採点GASのJSON `{ result: "true" }` / `{ result: "false" }` に合わせ、result文字列の前後空白除去後の完全一致だけを採用。部分一致、boolean型、空文字、null、不正JSON、HTTP200内のGASエラー文字列は採点エラー。生の応答・内部例外を生徒画面へ表示しない。
- 通信制御: 単問の待機上限10000ms（10秒）を利用者が正式採用。timeout・通信エラー・異常応答の指定3メッセージを使う。自動Retryなし。要求の識別はReact内のrefだけで行い、二重送信・二重確定と、無効化済み要求の結果/通知/loading更新を抑止。新しいGAS用識別子は送らない。一括採点の90000msは不変。
- 旧④からの取り込み: 回答保持、手動再試行、連打防止、10秒timeoutの意図とテストを最新mainへ個別反映。旧App.jsxの一括上書きなし。今回、厳密な応答判定・3種類の通知・要求識別と遅延応答検証を追加。
- テストモック修正: 初回166件中3件が実resetQuizStateのsetIsCampReviewModeをモックが提供せず失敗したため停止。再開承認後に3件すべて同じReferenceErrorであることを再現し、モックのstate/setterだけを補完。実アプリ処理の削除・無効化やassertionの緩和なし。
- test結果: `npm test` は164成功・2skip・失敗0（全166件）。基準mainは117成功・2skip。単問47件でtrue/false・前後空白・不正文字列・GASエラー・不正JSON・ネットワーク・timeout・連打・手動再試行・連続timeout・遅延応答・初期化後の要求競合・既回答/保存順序を検証。実Axios XHR adapterのメモリ内模擬通信を含む。既存の漢字/合宿復習・文字枠・結果戻り先・前置詞・ログ契約・認証/SSOテストも成功。
- build結果: `npm run build` 成功。`node scripts/verify-single-gemini.mjs --check` 成功（9種類の単問応答、模擬認証/SSO/session、履歴/保存/一括/認識、CSP、送信先置換、隔離build）。`node --check` と `git diff --check` 成功。
- lint結果: 全体は既存8件（App.jsx 6件、ChemistryPlayView.jsx 2件）で失敗。基準mainとのファイル/ルール/メッセージ比較で全8件一致、新規0。変更ファイルのlintはApp.jsxの既存6件のみ。他の変更JS・追加utility/テストは0。既存lint8件は修正していない。
- ローカル確認: 専用5204で外部API遮断モックを起動。確認ページ `/__single` と通常アプリ `/` のHTTP200・connect-src selfを確認し、通常HTMLに検証パネルなし。模擬ID `local-single` / password `mock-only`。起動は `node scripts/verify-single-gemini.mjs`。既存5193/5195/5197等は操作していない。
- CodexによるChrome実操作: 未実施。Chrome接続ツールがtimeoutし、Windows操作ツールでのChrome起動もアプリ承認timeoutとなった。Playwright等の既存ブラウザ実行ライブラリも未導入。サーバー起動・自動モック検証をPC実操作成功として扱わない。
- 利用者によるPC操作確認（利用者申告）: 正解○、不正解×、通信エラー、エラー後の手動再試行、10秒timeout、遅延応答の無視、Gemini異常応答、連打防止の8項目すべて合格。実GASを使用しないローカルモックでの確認であり、CodexによるChrome実操作とは区別する。
- 保存/既存機能影響: saveLog/getLogsの既存payload・no-cors/keepalive・studentSessionToken・前置詞answerDetailsは変更なし。保存payloadへのattemptId/isReview追加なし。25教材定義・全24CSV・ホーム・Version表示・A/B/Cコンポーネントは未変更。既存2テストの変更は追加refのモック注入のみ。保存/履歴/一括/認証/漢字等12ハンドラの基準コード一致、元④とA/B/C保留フォルダ275/275ファイルのSHA-256一致を確認。
- GAS/Gemini/Spreadsheet/gyoumu-app: すべて未変更。今回の再開では外部API通信なし。実GAS・Gemini・認識API・Spreadsheet・実生徒データ不使用。通常ログイン/SSOはモックテストのみ成功、実接続は未確認。
- 残るリスク: 10秒は利用者が正式採用済み。ただし、実GAS・Geminiの応答速度と同時利用・本番確認は未実施。10秒経過後もGAS内部の処理が継続する可能性があり、GAS内部停止やGemini重複実行の防止は保証しない。本番運用でtimeoutが頻発した場合は利用者と秒数を再検討する。フロントで失敗後の古い結果は採用しないが、GASがすでにtrue/falseへ変換した内部異常はフロントから識別できない。既存no-cors保存の成否確認は③の対象で今回は変更しない。
- Version: 現在4.3.0 → 更新なし（利用者指定）。ログイン/ホーム右下の共通定数表示を維持。Version Historyへ新番号追加なし。
- Commit: `fix: stabilize single Gemini grading and retry handling`（本コミット）。作成時点でpush / PR / mainマージ / Vercel自動反映は未実施。以後のSHA・チェック・Preview・Productionの結果はPRとリリース完了報告に記録する。clasp push / GASデプロイ / 本番データ変更は未実施。関連gyoumu-appコミット/Issueなし。実GASを使用する採点・保存確認はリリース承認の対象外。

### A・B・C統合版／Phase ②-4 最終監査・ローカルコミット（Issue番号未指定）

- 日付: 2026-10-28
- 状態: 統合版の利用者Windows Chrome主要PC操作合格を受領。Phase ②-4で15ファイルを最終監査し、実装・テストを追加変更せずローカルコミット対象を確定。push・PR・mainマージ・本番反映は未実施。
- 基準: GitHub main / origin/main / ローカルmainはいずれも `715f47d5eab52db71de87e2253ee2a4c1d82a422`。branch `codex/integrate-abc-local-20261028`。元mainのpull・reset・rebaseなし。
- A/C統合: Cを正本として通常漢字復習のquestion/answer→ja/en変換、1文字1枠（送り仮名込み・縦一列・最大360 CSSpx）、DPR/270論理座標、枠順の270×480認識入力、「覚えていない」、空欄時未採点、確認cancel時状態維持、処理中の二重確定防止を保持。Aの重複適用なし。Bの詳細は既存S-007項目を更新。
- 競合調整: KanjiTestView.jsxの復習初期化1箇所。通常・合宿とも既存resetQuizStateでQ1・回答等を初期化してから合宿復習modeを設定。合宿復習はシャッフル後最大20問。不要になったsetQuizAnswers propのみ削除。
- 結果戻り先: 既存画面のselectedBook.contentIdが空になる合宿漢字経路が原因。QuizPlayViewへactiveContentIdを渡し、結果ボタンの戻り先と文言だけに使用。合宿理科・社会・漢字は合宿メニュー、通常教材は既存メニュー。通常/復習それぞれ回帰確認。
- test結果: npm testは117件成功・2件skip・失敗0（全119件）。元mainは36件成功・2件skip。実ハンドラのVMモックで復習0/1/20/21/35件、社会複数分野、◎解除・○保持・再×、旧/新キー順序、通常/合宿漢字の再開始Q1、枠/座標/DPR、空欄・cancel・最終skip、連打/判定中処理、保存回数、結果戻り先、前置詞answerDetails、認証契約を検証。
- build結果: npm run build成功。node scripts/verify-abc-integration.mjs --check成功（模擬認証/SSO/セッション・履歴・採点・保存・CSP・送信先置換・隔離build）。git diff --check成功。
- lint結果: npm run lintは既存8件で失敗（App.jsx 6件、ChemistryPlayView.jsx 2件）。基準mainとファイル/ルール/メッセージの全8件が一致。変更ファイルはApp.jsxの既存6件のみ、新規エラー0。既存8件は修正していない。
- ローカル確認: 専用5193のモックをPC側で起動し、Windows Chromeで確認ページ・通常模擬ログイン後ホーム・合宿漢字復習Q1と2文字枠・模擬SSO後ホームとreload後セッション復元を表示確認。合宿理科は復習1問の模擬一括採点→結果→合宿メニューまで進み、採点1回・保存1回・履歴◎を確認。sandbox内起動はChrome到達不可（localhost EACCES）、PC側起動後に到達成功。スキップ確認ダイアログ操作時はブラウザ操作ツールがtimeoutし、当該確認タブを閉じて復旧。スキップ完了以降のPC操作を確認済みとはしていない。これは統合準備時のエージェント確認記録。後続の利用者PC操作合格結果は次項に記載。
- 統合版PC確認（利用者申告）: Aは通常漢字復習Q1・問題/文字枠・手書き模擬採点・結果/自分の回答/模範解答を確認。Cは文字数対応の縦枠・十字線・筆跡・縮小/スクロール・空欄再入力・skip cancel/確定/×/表示を確認。合宿理科は最大20問・2/20・結果→合宿メニュー・35→33件、社会は歴史/地理/公民同時選択・最大20問・10/20・結果→合宿メニュー・105→95件を確認。合宿漢字はQ1/20・文字枠/十字線・手書き採点/次問・skip・結果→合宿メニュー・対象数減少を確認。主要PC操作合格。実GAS・認識精度・iPad実機の合格を意味しない。
- Phase ②-4再検証: npm test 117成功・2skip・失敗0、build成功、lintは基準mainと同じ既存8件・新規0、git diff --checkおよび統合モック--check成功。saveLog/getLogsのpayload宣言を基準mainと照合、前置詞answerDetails・studentSessionToken維持、attemptId/isReviewの保存payload追加なし。
- 保全/範囲: 元A・B・C・④のHEAD/branch/statusと変更ファイルSHA-256を監査記録し、終了時25/25件一致。④の差分取込・変更・巻戻しなし。育成保全branch不変。全24CSVは元mainとバイト一致。認証/SSO・セッション・既存単問/一括採点・通信制御の14ハンドラと4 effectsは基準コード一致。saveLog/getLogsのaction/payload、studentSessionToken、前置詞answerDetails維持、attemptId追加なし。
- CSV/Gemini/GAS/Spreadsheet/gyoumu-app: CSV・GAS・Spreadsheet・gyoumu-app変更なし。GASソースの追加読取なし。Gemini/認識APIの実通信なし。採点・保存は全てモック。GitHub参照・mainのHEAD照会のみ外部通信実施。
- 未確認/リスク: 統合版の主要PC操作は利用者確認合格。iPad実機、実APIの認識精度（長い回答含む）、実GAS保存・同時利用・本番は未確認。iPad実機確認は利用者方針により推奨だが必須ではない。既存no-cors保存の成功保証・通信失敗処理追加は対象外。
- Version: 現在4.3.0 → 今回更新なし（利用者指定）。次Version候補未指定。4.3.0維持。共通定数、ログイン/ホーム右下表示コード、Version History変更なし。
- Commit: `fix: integrate kanji input and camp review improvements`（本コミット）。push / PR / mainマージ / clasp push / GASデプロイ / Vercelデプロイ / 本番確認は全て未実施。関連gyoumu-appコミット/Issueなし。
- 操作方法と詳細監査: docs/ABC_INTEGRATION_LOCAL.md。

### 育成関連コード分離 Phase 1（Issue番号未指定）

- 日付: 2026-10-28
- 状態: Phase 1実装、Phase 2A最終監査、Phase 2Bローカル実操作確認、Phase 2Cの2ブランチ通常pushとPreview READY確認を完了。Phase 3Aは既存Issueの記録更新とmain向けPR作成まで。main未反映・Production未デプロイ・本番未確認。
- 基準: 保存済みorigin/main `714d7cff1cdda2bdd4f4eaf1d992a47b35584bd4`。fetch/pullなし。
- 保全: `codex/character-growth-development`を714d7cfに新規作成。Phase A〜Fのソース・テスト・CHANGELOGを含む元ツリーを変更せず保持。Phase 2Cで同名GitHubブランチへ通常push済み。ローカル・GitHubともHEADは714d7cfのまま。
- 作業: `codex/split-growth-from-main`、作業基点 `714d7cf`。新規worktree `C:/Users/netz/.codex/worktrees/split-growth-from-main/student-app`だけで変更。
- 育成専用8ソースを分離: `src/constants/{characterMaster,itemMaster,releaseFeatures}.js`、`src/utils/{characterCare,experienceProgress,streakPoints,localXpVerification,localShopVerification}.js`。
- 育成専用10テストを分離: `test/{characterCare,characterProgress,experienceProgress,itemMaster,localCharacterCare,localCharacterCompletion,localEquipmentVerification,localShopVerification,localStreakPoints,streakPoints}.test.js`。
- 未使用コード: 目標表示だけでは利用元がなくなる `src/utils/{learningAttempt,dailyMissionAttempt,localDailyMissionVerification}.js`と `test/{learningAttempt,localDailyMissionVerification}.test.js`を除外。元コードは保全ブランチで保持。
- 混在箇所: App.jsx、MenuView.jsx、App.css、CampView / ChemistrySetupView / KanjiTestView / OtherSetupsView / PrepositionTestView / QuizPlayView / QuizSetupViewから育成用import・state・props・関数・画面・CSS、attempt連携、確認用完了操作を除外。無効化フラグ方式は廃止。
- ホーム表示: ③キャラクター育成の見出し・作成中表示・説明・UserRoundアイコン・カードCSS、④最近の学習・復習の説明・準備中表示を維持。①目標・準備中、②科目・教材数・特別モード、ヘッダー、ログアウト、Version、4項目ナビと3項目disabledも維持。ナビは現行表示の4列へ固定。
- ミッション: 英単語3回・漢字3回の権限別目標表示だけを維持。報酬定義・実進捗取得・集計・加算を除外。studentSession.jsの未使用進捗整形だけを除外し、session認証は維持。
- CSV影響: public配下の全CSVは714d7cfから変更なし。25教材定義、公民240問（社会計703問）、三木p104の19語を維持。元フォルダの未commit17語は取り込まず、そのまま保全。
- Gemini影響: 採点方式・呼出条件は変更なし。採点・認証・CSV読込等14関数が基準と改行以外同一であることを確認。実Gemini API通信なし。
- GAS / 保存影響: GAS・Spreadsheet・本番データは未変更。saveLog/getLogs、session token、history、採点結果、前置詞answerDetails、no-cors/keepaliveを維持。saveLogにattemptId / isReviewを追加しない。52ケースのログpayload・送信オプションが基準と同一であることを通信なしのモックで確認。
- test: `npm test`成功（36件pass、ブラウザ親2件は通常実行ではskip）。
- build: `npm run build`成功。
- lint: 変更前後とも既存8件のみで失敗。App.jsxの不要escape4件・未使用catch変数2件、ChemistryPlayView.jsxのFast Refresh制約1件・effect内setState1件。今回の新規エラーなし。
- git diff --check: 成功。
- ローカル画面: 既存Playwright / Chromeでdevelopment・production各9項目＋親、計20件成功。通常ログイン、SSO、session復元、ログアウト、権限0件・未取得・拒否、25教材すべての設定画面への導線を確認。前置詞通常20問・復習1問の完了→1回保存→ホーム復帰とanswerDetails、理科20問のGemini一括1回→ログ1回をモック確認。全教材の採点完了は未確認。
- 見た目比較: 714d7cfのソース写しと分離後で、1440×1000 / 390×844、単一権限 / 全科目表示、development / productionの8枚を比較し差分0ピクセル。撮影はmouse位置・reduced-motion・animation停止条件を統一。③・④のカードと4項目ナビを目視確認。
- 通信確認: ブラウザテストは127.0.0.1以外を遮断。アプリの外部リクエスト試行0、想定外action0、console/page error0。認証・ログ・Geminiは全てローカルモック。実GAS・実アカウント・本番動作は未確認。
- 残存: 育成実装・API・フラグ・報酬・ストアなし。静的な準備中カード、そのCSS、否定検証の文字列、過去CHANGELOG記録のみ維持。既存教材の復習用isReviewModeは維持（saveLogのisReviewとは別）。
- 保全確認: 元のmainおよび開始時から存在する4つの別worktreeについて、HEAD・ブランチ・status・未commit差分・ステージ済み差分・未追跡一覧が不変であることを終了時に照合。
- 未解決: 既存lint8件。通常漢字復習等の既存不具合候補は対象外。実GAS・本番確認、別リポジトリの育成GAS成果の保全は未実施。
- Version: 4.3.0から変更なし。ログイン・ホームの共通定数を維持。Version History変更なし。
- Phase 2A最終監査: 2026-10-28、Phase 1の39ファイルを全件確認。削除23ファイルは保全ブランチの基準内容と一致。session認証、ログイン/SSO/touch、既存14関数、過去CHANGELOGを維持。CSV・25教材定義・Versionは基準と同一。未使用コード・残存育成実装・import漏れなし。
- Phase 2A再検証: npm test 36件成功（通常時のブラウザ親2件skip）、build成功、lintは同じ既存8件のみ。専用ブラウザ20件成功、PC/スマートフォン8画像の差分0。52ケースのログ契約一致、attemptId/isReview付加なし。実GAS・本番は未確認。
- Phase 2Bローカル実操作: localhostの常駐モックで確認完了（反復入力はブラウザ操作ツールで実施）。前置詞通常20問と誤答20問の復習20/20、理科20問18/20と復習2/2、公民「国会」7問5/7と復習2/2、古文20問19/20と復習1/1、結果保存・ホーム復帰・session再認証を確認。全25教材の完走確認ではない。
- Phase 2Bホーム: PC 1440×1000 / スマートフォン幅390×844で①今日のミッション、②学習をはじめる、③キャラクター育成「作成中・・・」、④最近の学習・復習「横断集計機能は準備中」、ヘッダー・ログアウト・4項目ナビ・Version 4.3.0を確認。横はみ出しなし。既存画像との目視比較であり、Phase 2Aの差分0ピクセル検証とは区別。
- Phase 2Bログ: モック保存9件すべてにcontentId / history / score / total / session情報があり、attemptId / isReviewなし。前置詞の通常・復習で各20件のanswerDetailsを維持。育成API呼出し、アプリconsole / page error、外部接続の遮断イベントは0件。9件には出題順を取り違えた社会復習0/2の試行を含み、表示問題に合わせた再試行で2/2を確認。
- Phase 2B確認範囲: 認証・採点・ログ保存/取得はすべてローカルモック。漢字手書き認識、実GAS / Gemini、SSO実接続、全教材・全問の操作、本番データ・同時利用は未確認。通常漢字復習・合宿復習等の既存不具合候補は修正していない。test / build / lintの再実行はなし。
- Phase 2C GitHub: `codex/character-growth-development` = `714d7cff1cdda2bdd4f4eaf1d992a47b35584bd4`、`codex/split-growth-from-main` = `ad85116141eed20a2ecfc37b887edb13840bc80c`の通常push後HEADを確認。GitHub mainは714d7cfのまま。元mainの未コミット17語と他worktreeのHEAD・差分を維持。
- Phase 2C Preview: GitHub連携の `https://student-dviyi9sej-kotas-projects-f3ee9ea6.vercel.app/` がREADY。対象SHAはad85116、sourceはgit、Previewフィルターでも一致しProductionではない。push以降の新規Productionデプロイは0件。
- Preview画面の確認範囲: エージェントのChrome確認はVercel認証画面まで。既存CLI認証も利用できず、Previewのスキマくんログイン画面・Version表示・アプリconsole / 静的ファイル取得エラーは未確認。利用者側での追加確認は確認待ち。
- Preview実ログイン・学習操作: 未確認。本番生徒アカウントを使用せず、実GASへの認証・学習ログ送信も行っていない。Phase 2Bのローカルモック確認をPreview成功として扱わない。
- Phase 3A直前監査: 追加変更はCHANGELOGのみ。25教材定義・全CSV・公民240問（社会703問）・Version 4.3.0は714d7cfと一致。育成専用コード・報酬・育成API・attempt連携の残存なし。③作成中・④準備中の静的UIを維持。過去の育成開発記録とVersion Historyは保持。文書更新のためtest / build / lintは再実行せず、Phase 2Aの自動検証結果とPhase 2Bの操作確認を区別する。
- Commit: Phase 2Aの育成分離は `ad85116141eed20a2ecfc37b887edb13840bc80c`（`refactor: separate character growth implementation from student app`）。Phase 3AはCHANGELOGのみの記録更新（本コミット）。
- Push: Phase 2Cで保全ブランチ714d7cfと分離ブランチad85116の通常push完了。Phase 3Aのpush対象も分離ブランチのみ。mainへのpush・マージ、rebase、reset、force push、clasp push、GAS / Productionデプロイ、本番データ変更は未実施。
- 関連gyoumu-appコミット / Issue: なし。gyoumu-app変更なし。

### 新ホーム先行公開準備：キャラクター育成を作成中表示（Issue番号未指定）

- 状態: ローカル実装・単体テスト・development / productionブラウザモック検証完了。正式リリース・本番公開判定は未実施
- 作業基点: `codex/sukimakun-junior-home-renewal` の `cfb5d5a7bcd0f62a7109f7a11a415bbf85e97610`。隔離作業ツリーの `codex/sukimakun-home-prerelease` で作業。元の `main` (`2f93df2`) と開始時の `public/miki_high_school.csv` 17行追加は保持
- 変更内容:
  - 既存の小・中学生向け新ホームを継続使用し、科目別学習・高校生・合宿の導線と教材権限を維持
  - キャラクター欄を「キャラクター育成」「作成中・・・」と指定の補足文に変更。画像・操作ボタンは不要
  - `src/constants/releaseFeatures.js` の `CHARACTER_GROWTH_ENABLED = false` で育成を停止。新ホーム自体は常時有効。development / production共通の固定値で、環境変数・画面・保存状態では有効化しない
  - 育成ストア初期作成・再作成、ミッション進捗取得、XP/PT/連続学習/未学習ペナルティ、キャラ選択・進化・装備・ショップ・アルバム・育成完了の処理と画面を遮断。作成済みコードは保持し、保存済みデータの削除・初期化・補填は行わない
  - 復元された育成画面のstateや育成propsがあっても表示・操作しない。未取得のミッション進捗は準備中（`--`）、最近の学習・復習の横断集計は既存の準備中表示を維持
  - 通常 `saveLog` から育成起動用の `attemptId` / `isReview` 追加payloadだけを除外。`contentId` / `history` / 採点結果 / 前置詞 `answerDetails` / session tokenは維持。`getLogs`、教材内復習、採点方式、認証session維持は変更なし
  - development限定の既存ローカル前置詞確認入口は育成を初期化せず前置詞だけ利用可能にした
- CSV影響: 隔離側の public/miki_high_school.csv をmainコミット 2f93df2 の70件（No.1〜70、p70/p72/p74/p76、4列）へバイト単位で一致させた。隔離元の旧121件・末尾空列から置換。元の作業場所の87件CSV・未コミット17件（No.73〜89）は取り込まず保全。その他23CSVは変更なし
- Gemini影響: 既存の一次判定・一括判定・呼出条件に変更なし。実通信未実施
- GAS影響: 変更なし。別ディレクトリのローカルログGASを読み取り確認。`attemptId` ありの `saveLog` は育成シート初期化・XP/PT/ペナルティ更新を行うため、既存の `attemptId` なし互換経路で通常ログだけ保存する。既存GASモックテスト3件（旧saveLog、token付きsaveLog、tokenなしgetLogs互換）は成功
- build結果: 2026-09-20 `npm run build` 成功
- lint結果: 2026-09-20 `npm run lint` は変更前と同じ既存8件（`App.jsx` 6件、`ChemistryPlayView.jsx` 2件）。今回の追加エラーなし
- test結果: 2026-09-20 `npm test` 89件成功、ブラウザ親2件は通常実行ではskip。追加の `npm run test:home-browser` はdevelopment / production各7項目（子14件＋親2件、計16件）成功。既存インストール済みPlaywrightとChromeを利用し、依存ダウンロードなし
- `git diff --check`: 成功
- ローカル確認: PC 1440px / 狭幅390pxの全科目ホームをスクリーンショットでも目視確認。育成表示・ボタン・画像・モーダル・APIなし。書き単/漢字設定、高校生/合宿、教材権限・権限0件・SSO権限未取得時の拒否を確認。前置詞20問完了→ログ1回→ホーム復帰、既存履歴1問復習→追加ログ1回を確認。`history` の方向別固定キーと通常○/復習◎、`answerDetails` を維持。保存済み育成Ref・旧verification state・shop/album等を復元して全育成callbackを呼んでも値は不変。育成ストア初期作成なし、認証session以外のアプリタイマーなし、console/page error 0、アプリからの外部リクエスト試行0。各APIはローカルモックで検証
- 通常ログイン / SSO / 保存session復元 / ログアウト: development / productionのモックで成功。実GAS・実アカウントでの確認は未実施。既存の通常login時legacy権限応答互換は変更なし
- 公開GASコード確認: 元の設定に対応する公開v19ソースを管理APIから読み取り確認済み。12列の通常saveLogにattemptIdは不要で、受付から保存まで育成処理なし。前記GASモック3件はローカル開発ソース対象であり公開v19対象ではない。本番データ・実送信は未確認。Preview配信版のログ保存先一致はcommit後に確認する
- Version: 4.3.0のまま。利用者指示により更新不要。ログイン・ホームとも共通定数を維持。Version History変更なし
- Commit: 本項目を含む先行公開準備コミット。指定8ファイルを対象
- Push / Vercel Preview: commit時点では未実施。利用者の指示によりこのコミットを隔離ブランチへ通常pushし、Git連携で生成されるPreviewを確認する。Production対象はVercel設定画面でmainと確認済み
- mainマージ / Production公開 / clasp push / GAS再デプロイ / 本番セットアップ / 本番データ変更: 未実施
- 関連gyoumu-appコミット / Issue: なし。gyoumu-app・netz-os変更なし

### 育成システム Phase F：育成完了・アルバム・次キャラ基盤（Issue番号未指定）

- 状態: student-app、認証GAS、ログGASへlocal onlyで実装。Production未接続
- 育成完了: Lv100 / Stage6 / activeをcompletionReadyとして派生し、明示確認後にstatus=completed、endedAt、endReason=completedを確定
- 完了報酬: EconomyLedgerへ`character_complete::{characterInstanceId}`を正本として500ptを冪等付与し、partial failure再送時にstatus／Ledger／pointBalanceを修復
- アルバム: 新規Albumシートを作らず、completed/game_overのCharacterInstancesを終了日時降順で取得。最終Lv、Stage、装備、visualBranch、終了理由を表示
- 次キャラ: 終了済み個体を保持したまま既存3キャラ選択UIを再利用し、新instanceId、空装備、careStartedDate、pendingXp移管で育成を再開
- 資産: Player単位のpointBalance、streak、common／character-specific所有品を維持。evolution-limited所有品は旧characterInstanceへ保持
- ローカル確認: development限定でLv100 completionReady、完了500pt、アルバム、次キャラ作成を確認可能。正式画像は未作成
- GAS影響: completeCharacter/getCharacterAlbumと次キャラ対応、character:complete-own scopeをローカル追加。GAS未push・未deploy
- Spreadsheet影響: 本番実変更なし。既存CharacterInstancesを再利用し、新規Albumシートなし。setup未実行
- Production / Version: Production未接続。Version 4.3.0とVersion Historyは変更なし
- Commit: `feat: complete character lifecycle and album foundation`でlocal checkpoint化
- Push / mainマージ / Vercel / clasp push / GASデプロイ / setup / Spreadsheet変更 / 本番通信: 未実施

### 育成システム Phase E2：装備・見た目・進化限定基盤（Issue番号未指定）

- 状態: student-app、認証GAS、ログGASへlocal onlyで実装。Production未接続
- 変更内容: 固定7スロットのequipmentJson、所有確認付きequip/unequip、同一slot自動付け替え、キャラ専用品制限、終了キャラの装備固定を追加
- 進化限定: 3キャラ×Lv20/40/60/80/100の15商品を個体所有として追加。価格は250/350/600/800/1,200pt、現在Lv区間だけ購入可能
- visualBranch: Lv60商品所有後、各キャラ3候補から一度だけ選択しCharacterInstanceへ保存。性能差なし
- 見た目: assetKeyとplaceholder/CSSによるdevelopment限定簡易反映。正式画像は未作成
- GAS影響: CharacterInstances末尾へequipmentJson、equipItem/selectVisualBranch action、character:equip-own scopeをローカル追加。GAS未push・未deploy
- Spreadsheet影響: 本番実変更なし。setup未実行、既存列は維持
- 未実装: Lv100 status=completed、+500pt、アルバム、次キャラ選択、正式画像、gyoumu-app管理UI
- Production / Version: Production未接続。Version 4.3.0とVersion Historyは変更なし
- Commit: `feat: add equipment and evolution customization foundation`でlocal checkpoint化
- Push / mainマージ / Vercel / clasp push / GASデプロイ / setup / Spreadsheet変更 / 本番通信: 未実施

### 育成システム Phase E1：ショップ・購入・所持アイテム基盤（Issue番号未指定）

- 状態: student-app、認証GAS、ログGASへlocal onlyで実装。Production未接続
- 変更内容:
  - 共通20件・キャラ専用9件の表示用ItemMasterをstudent-appへ追加し、ログGAS側の同一itemId定義を購入価格・購入可否の正本として追加
  - OwnedItems schema、player所有の`userId::itemId`、購入時pricePaid、source/sourceIdを追加
  - `purchaseRequestId`由来eventKeyでEconomyLedgerへ負数PTを一度だけ記録し、pointBalanceを台帳から再構築する購入基盤を追加
  - Ledger作成後にOwnedItems書き込みが欠けたpartial failureを再送で修復し、既所有・同一request・残高不足・キャラ条件不一致を二重課金なしで処理
  - `getShopItems`と`purchaseItem`をstudent session token必須actionとして追加し、認証GASの新規session scopeへ`shop:read`と`points:spend-own`を追加
  - development限定ショップで所持pt、価格、共通／専用、所有済み、ポイント不足、対象キャラ条件を確認可能にした
- ItemMaster保存方式: Phase E1はGASコード定数を価格正本とする。将来gyoumu-app管理に移行する際は`getShopItems`の返却契約を維持してSpreadsheet masterへ移行可能
- Spreadsheet影響: 本番実変更なし。OwnedItems schemaとsetup helperは追加したがsetup未実行
- GAS影響: ローカルコードとテストのみ変更。GAS未push・未deploy、Script Property未変更
- 未実装: 装備、見た目反映、進化限定商品の正式購入、visualBranch、アルバム、Lv100育成完了、正式画像
- test / build / lint: `npm test` 80件成功、`npm run build`成功、変更対象lintは新規エラーなし。`npm run lint`は既存8件のみ、`git diff --check`成功
- GASローカル確認: ログGAS `node --check`成功・54件成功、認証GAS `node --check`成功・8件成功
- ローカル確認: `http://127.0.0.1:5176/`で500pt開始、丸メガネ購入後400pt・所有済み、プリン専用品、他キャラ条件、game over後の共通／専用品条件、console errorなしを確認。外部API通信なし
- Production確認: buildを`http://127.0.0.1:4181/`で開き、ローカルE2E入口、ショップ、pt付与、購入ボタンが0件であることを確認
- Version: 4.3.0のまま。Version Historyと共通定数は変更なし
- Commit: `feat: add shop and item purchase foundation`でlocal checkpoint化
- Push / mainマージ / Vercel / clasp push / GASデプロイ / setup / Spreadsheet変更 / 本番通信 / 本番確認: 未実施

### 育成システム Phase D：未学習状態・ゲームオーバー（Issue番号未指定）

- 状態: student-appとログGASへlocal onlyで実装。Production未接続
- 変更内容:
  - CharacterInstanceの`careStartedDate`とPlayerProgressの正式な`lastLearningDate`の新しい方を基準に、JST日付で未学習日数を算出する純粋関数を追加
  - 未学習0〜1日をhealthy、2日をfaded、3日をweak、4日をhospitalized、5日をcritical、6日以上をgame_overとして表示する状態基盤を追加
  - `getPlayerProgress`と通常学習完了時のlazy evaluationにより、6日到達時だけCharacterInstanceを`game_over`へ冪等遷移し、`endedAt`と`endReason=inactivity`を保持
  - game over後もactiveCharacterInstanceIdと最終Lv／XP／Stage、Player単位のpointBalanceを保持し、以後の学習XPを旧キャラでなくpendingXpへ投影
  - development限定E2Eへ日付進行と当日学習操作を追加。正式画像は作成せず、opacity、状態ラベル、医療アイコン、育成終了表示で確認可能にした
- Spreadsheet影響: 本番実変更なし。CharacterInstancesの`careStartedDate`／`endReason`追加schemaはsetup未実行
- GAS影響: ローカルコードとテストのみ変更。GAS未push・未deploy、Script Property未変更
- 未実装: 次キャラ選択、Lv100育成完了、ショップ、アイテム、pt消費、アルバム、正式キャラクター画像
- test / build / lint: `npm test` 73件成功、`npm run build`成功、変更対象lintは新規エラーなし。`npm run lint`は既存8件のみ、`git diff --check`成功
- GASローカル確認: ログGAS `node --check`成功・48件成功
- ローカル確認: `http://127.0.0.1:5175/`でDay1〜6の全condition、Day5通常学習によるhealthy回復、console errorなしを確認。外部API通信なし
- Production確認: buildを`http://127.0.0.1:4180/`で開き、ローカルE2E入口、日付操作、回復操作、game overテスト表示が0件であることを確認
- Version: 4.3.0のまま。Version Historyと共通定数は変更なし
- Commit: 未実施
- Push / mainマージ / Vercel / clasp push / GASデプロイ / setup / Spreadsheet変更 / 本番通信 / 本番確認: 未実施

### 育成システム Phase C：連続学習・交換用pt基盤（Issue番号未指定）

- 状態: student-appとログGASへlocal onlyで実装。Production未接続
- 変更内容:
  - 正常完了した通常LearningAttemptをJSTの学習日として扱い、同日1回だけcurrentStreak／longestStreak／streakStartedDate／lastLearningDateを更新する基盤を追加。復習、途中離脱、同一attempt再送は対象外
  - 7日周期の週間報酬（5/5/10/10/15/15/30pt）と連続30日ごとの100ptを、EconomyLedgerのPT取引としてeventKeyで冪等付与
  - CharacterInstanceごとのLv10／30／50／70／90到達報酬を追加。複数Lv跨ぎとpendingXpからの初回キャラ作成にも対応し、Lv100完了500ptは未実装
  - EconomyLedgerをXP/PT共通台帳として利用し、PlayerProgress.pointBalanceを台帳から修復可能な投影として追加
  - development限定E2Eへ翌日学習、1日休み、30日学習を追加し、ホーム上部へcurrentStreakとpointBalanceを表示。Productionでは操作・mock値とも非表示
- Spreadsheet影響: 本番実変更なし。PlayerProgress拡張schemaとEconomyLedger PT対応はsetup未実行
- GAS影響: ローカルコードとテストのみ変更。GAS未push・未deploy、Script Property未変更
- 未実装: Phase Dの未学習状態／ゲームオーバー、ショップ、アイテム、アルバム、Lv100育成完了500pt、pt消費
- test / build / lint: `npm test` 67件成功、`npm run build`成功、変更対象lintは新規エラーなし。`npm run lint`は既存8件のみ、`git diff --check`成功
- GASローカル確認: ログGAS `node --check`成功・45件成功
- ローカル確認: `http://127.0.0.1:5174/`でDay1〜8（95pt）、30日（470pt）、1日空白後のstreak=1、Lv10／30報酬（合計300pt）とconsole errorなしを確認。外部API通信なし
- Production確認: 最終buildを`http://127.0.0.1:4179/`で開き、ローカルE2E入口、日付加速、mock streak／pt、XP操作が0件であることを確認
- Version: 4.3.0のまま。Version Historyと共通定数は変更なし
- Commit: Phase Cのlocal checkpoint commitを実施（本項目を含む）
- Push / mainマージ / Vercel / clasp push / GASデプロイ / setup / Spreadsheet変更 / 本番通信 / 本番確認: 未実施

### 育成システム Phase B：キャラクター選択・進化表示（Issue番号未指定）

- 状態: student-app、認証GAS、ログGASへlocal onlyで実装。Production未接続
- 変更内容:
  - プリン／ペンギン／太陽の表示用Character Masterと、各キャラ共通のStage 1〜6定義を追加。正式画像は作成せず、差し替え可能なassetKeyと絵文字placeholderを使用
  - development限定E2Eをキャラ未選択状態から開始し、学習XPをpendingXpへ保持してから確認付きキャラ選択でCharacterInstanceへ移すフローを追加
  - activeキャラの名前、Lv、累計XP、次Lvまで、進捗バー、stage名、次の進化までをホーム育成カードへ表示
  - development限定XP境界操作でLv20／40／60／80／100のstage変更を確認可能にした。Production buildには選択・加速・mock操作を表示しない
  - ログGASへtoken認証済み`getPlayerProgress`／`selectInitialCharacter`、3キャラ検証、selectionRequestId冪等、ScriptLock内作成、pendingXp移管をローカル実装
  - 認証GASの新規生徒sessionへ`progress:read-own`、`character:read-own`、`character:select-own` scopeを追加
- CharacterInstance / Spreadsheet影響: 本番実変更なし。正式CharacterInstance未作成、CharacterInstances schemaのselectionRequestId追加もsetup未実行
- GAS影響: ローカルコードとテストのみ変更。GAS未push・未deploy、Script Property未変更
- 未実装: 正式画像、交換用pt、連続学習、ゲームオーバー、ショップ、アイテム、アルバム、visualBranch選択、Lv100完了処理
- test / build / lint: `npm test` 56件成功、`npm run build`成功、新規・関連変更ファイルlint成功。`npm run lint`は既存8件のみ、`git diff --check`成功
- GASローカル確認: ログGAS `node --check`成功・40件成功、認証GAS `node --check`成功・生徒session 8件成功
- ローカル確認: 未選択で漢字1セット25XPをpendingへ保持し、プリン選択でCharacterInstanceへ反映。Lv19→20、39→40、Lv60、80、100でStage 1→6とstage名が切り替わることを確認
- Production確認: 最終buildを`http://127.0.0.1:4177/`で開き、ローカルE2E入口、完了ボタン、キャラ選択、mock XP、XP境界操作が0件であることを確認
- Version: 4.3.0のまま。Version Historyと共通定数は変更なし
- Commit: Phase Bのlocal checkpoint commitを実施（本項目を含む）
- Push / mainマージ / Vercel / clasp push / GASデプロイ / 本番通信 / 本番確認: 未実施

### 育成システム Phase A：XP・Lv基盤（Issue番号未指定）

- 状態: student-appとログGASへlocal onlyで実装。Production未接続
- 変更内容:
  - 通常学習完了時に妥当なscoreを1正解=1XPとして扱い、復習・紙テスト・高校生教材・異常scoreをXP対象外とする基盤を追加
  - `次Lv必要XP = 40 + 現在Lv × 2`、Lv100累計13,860XP、Lv上限、stage 1〜6を純粋関数化
  - daily mission定義へ`rewardXp: 30`を追加し、達成遷移を日付・mission単位のeventKeyで一度だけ付与
  - development限定E2Eへpuddingの仮active CharacterInstanceとメモリ内XP台帳を追加。正式値未接続時の本番UIは従来の準備中を維持
  - ログGASのMissionAttemptsを本番setup前にLearningAttemptsへ一般化し、EconomyLedger、CharacterInstances、PlayerProgressのschemaと冪等setupをローカル実装
  - XP台帳を付与正本とし、CharacterInstanceのtotalXp／level／stageまたはPlayerProgress.pendingXpを再送時に再構築できる処理を追加
  - scoreはクライアント申告値を有限整数かつ`0 <= score <= total`で検証するが、サーバー再採点は未実装。ランキング用途の公平性正本には使用しない
- Spreadsheet影響: 実変更なし。LearningAttempts、EconomyLedger、CharacterInstances、PlayerProgressは未作成、setup未実行
- GAS影響: `C:\Users\netz\student-app-log-gas`のローカルコードとテストのみ変更。GAS未push・未deploy
- CSV / Gemini影響: なし。既存CSV、採点、Gemini呼び出し条件を変更していない
- test / build / lint: `npm test` 51件成功、`npm run build` 成功、新規・関連変更ファイルlint成功。`App.jsx`を含むlintは同ファイル既存6件のみ、`npm run lint`は既存8件のみ、`git diff --check`成功
- GASローカル確認: `node --check コード.js`成功、`node --test コード.test.cjs` 36件成功
- ローカル確認: `npm run dev -- --host 127.0.0.1`（`http://127.0.0.1:5173/`）で漢字25問セットを3回完了し、XP 25→50→105（3回目はミッション達成+30XP）、Lv1→2→3、漢字1/3→2/3→3/3を確認
- Production確認: `npm run preview -- --host 127.0.0.1`（`http://127.0.0.1:4173/`）でローカルE2E入口、完了ボタン、仮XPカード、XP加速UIが0件であることを確認
- Version: 4.3.0のまま。Version Historyと共通定数は変更なし
- Commit: Phase Aのlocal checkpoint commitを実施（本項目を含む）
- Push / mainマージ / Vercel / clasp push / GASデプロイ / 本番通信 / 本番確認: 未実施

### 小・中学生教材の共通attempt lifecycle（Phase 0・Issue番号未指定）

- 状態: student-appへローカル実装。XP・Lv・pt・キャラクター・ショップおよびGASのLearningAttemptsは未実装
- 変更内容:
  - アプリ内でscore／totalが確定する小・中学生向け10教材を、デイリーミッション専用ではない共通learning attempt対象として明示
  - 実際の問題セット開始時に教材ごとのattemptIdと明示的なisReviewを保持し、正常完了してsaveLogへ進む時だけ同じattemptIdをpayloadへ追加
  - 前置詞、化学、合宿理科・社会へ共通attempt開始を追加し、古文・合宿漢字を含む既存開始処理も共通契約へ接続
  - 中断、別教材への遷移、logoutでは未完了attemptを破棄。reloadではReact stateが復元されないため未完了扱いを維持
  - 紙テスト作成はアプリ内採点・完了ログを持たないためattempt対象外
  - 既存デイリーミッション4教材、復習除外、同一attempt重複除外、development限定ローカルE2Eの契約を維持
- CSV影響: なし
- Gemini影響: なし。既存の一次判定・Gemini判定・一括判定に変更なし
- GAS / Spreadsheet影響: 変更なし。将来のLearningAttemptsへ渡せるattemptId／contentId／isReview／score／total契約をstudent-app側で準備
- test結果: 2026-09-02 `npm test` 成功（43件。共通attempt対象10教材、通常／復習、セット間ID更新、完了・中断・教材不一致、既存デイリーミッションE2Eを含む）
- build結果: 2026-09-02 `npm run build` 成功。production previewでdevelopment限定E2E入口が非表示であることを確認
- lint結果: 変更対象lint成功。`npm run lint`は既存8件（`App.jsx` 6件、`ChemistryPlayView.jsx` 2件）のみで失敗し、今回追加エラーなし
- ローカル確認: `http://localhost:5173/`で外部通信なしの漢字E2E 1/3→2/3→3/3・達成表示、前置詞の通常セット開始、reloadによる未完了終了、console errorなしを確認
- Version: 4.3.0のまま。Version Historyと共通定数は変更なし
- Commit / Push / mainマージ / Vercel / clasp push / GASデプロイ / 本番確認: 未実施

### 生徒session認証基盤（Issue番号未指定）

- 状態: student-app、認証GAS、ログGASへローカル実装。GAS未push・未deploy、認証Spreadsheet未変更のため本番未接続
- 変更内容:
  - 通常ログインとuid/tk SSO成功時に共通の生徒session tokenを発行する認証GASローカル実装を追加
  - tokenは`ss1.`＋UUID 2個、SpreadsheetにはSHA-256 hashだけを保存する設計
  - 認証Spreadsheetの「生徒セッション」17列schema、12時間absolute期限、2時間idle期限、30分touch、logout revoke、active上限3件を追加
  - `validateStudentSession`、`touchStudentSession`、`revokeStudentSession` actionを追加
  - student-appはtokenを`sessionStorage`へ保持し、SSO優先・session復元・best-effort revoke・visible時30分touchへ対応
  - 既存`saveLog`の`mode: no-cors`を維持したままtokenをpayloadへ追加し、`getLogs`とミッション進捗取得にも同じtokenを使用
  - ログGASは`STUDENT_AUTH_SPREADSHEET_ID`から認証Spreadsheetを参照し、token由来userId、scope、allowedContentIdsを正本にするPhase 1互換処理を追加
  - token付き認証失敗時は匿名処理へfallbackせず、tokenなしの既存`saveLog`／`getLogs`だけを移行期間中維持
  - `getDailyMissionProgress`をtoken必須actionとしてローカル接続し、取得成功時だけホームへ数値進捗を表示。未接続・失敗時は`-- / 3`を維持
- 認証GAS影響: `C:\Users\netz\gyoumu-app\gas`のローカルソースとテストのみ変更。管理session、6桁SSO tokenの5分・一回限り仕様は維持
- ログGAS影響: `C:\Users\netz\student-app-log-gas`のローカルソースとテストのみ変更。匿名互換は既存saveLog/getLogsに限定
- Spreadsheet影響: 実変更なし。「生徒セッション」シート未作成、setup未実行、`STUDENT_AUTH_SPREADSHEET_ID`未設定
- CSV影響: なし
- Gemini影響: なし。採点処理・API呼び出し条件に変更なし
- セキュリティ: token平文をSpreadsheet・URL・ログ・エラーへ出力しない。token付き処理はsession由来userIdと権限を使用
- test結果: 2026-09-02 `npm test` 成功（34件）。認証GAS生徒sessionテスト成功（8件）。ログGAS回帰・認証・ミッションテスト成功（29件）
- build結果: 2026-09-02 `npm run build` 成功
- lint結果: 新規・変更した認証関連モジュールとテストは成功。`App.jsx`の既存6件と`ChemistryPlayView.jsx`の既存2件により`npm run lint`は失敗し、今回追加エラーなし
- `git diff --check`: 2026-09-02 成功
- ローカル確認: 外部認証・ログGASへの実通信なし。本番GAS未デプロイのため実session発行と実進捗取得は未確認
- Version: 4.3.0のまま。Version Historyと共通定数は変更なし
- Commit: 認証基盤差分は未commit
- Push / mainマージ / Vercel / clasp push / GASデプロイ / 本番確認: 未実施

### デイリーミッション基盤（Issue番号未指定）

- 状態: 専用ブランチ上でstudent-appとログGASのローカル基盤を実装。ホームは権限に応じた正式ミッション内容を表示し、実進捗だけを「準備中」としている
- 変更内容:
  - 英単語（`kakitan`、`junior_english_quiz`、`irregular_verbs`）3セットと漢字（`kanji_test`）3セットのデフォルト定義を1か所へ追加
  - 対象教材の通常／復習セット開始時に`crypto.randomUUID()`由来のattemptIdを生成し、完了時の既存`saveLog` payloadへattemptIdとisReviewを追加
  - 復習、合宿漢字、古文、その他教材をミッション加算対象外として維持
  - ログGASを既存12列維持＋M列attemptIdの13列schemaへ後方互換拡張するローカル実装を追加
  - GAS内へ英単語・漢字のデフォルト定義、attempt重複排除、MissionAttempts記録、DailyMissionProgress更新、JST日付境界処理を追加
  - 本人認証方式が未確定のため、進捗取得は内部関数とテストまで実装し、匿名公開doPostのactionには未接続
  - `MissionAttempts`と`DailyMissionProgress`を安全に作成する冪等setup関数を追加（未実行）
  - `dailyMissions.js`の定義と既存教材表示名を利用し、`allowedContentIds`と交差したミッション名・必要回数・対象教材をホームへ表示
  - 進捗未接続時は実績値に見える`0 / 3`を避け、`-- / 3`と「準備中」を表示。対象教材が0件または権限初期化前はミッションを表示しない
  - Vite development時だけ利用できる外部保存なしのローカルE2E入口とメモリ内進捗モックを追加。既存attemptId・isReview・ミッション定義を利用し、対象教材の正常完了だけを加算
  - ローカルE2Eでは同一attemptId、復習、途中離脱、対象外教材を加算せず、漢字と英単語3教材を実行画面から外部採点なしで完了できる確認操作を追加。正式進捗保存にlocalStorageは使用しない
  - 通常ログインとuid/tk SSOの認証経路を調査。生徒の通常ログインはセッショントークンを発行せず、SSOの6桁トークンは5分期限かつ検証成功時に消去されるため、ログGASの継続認証には新しい本人セッション設計が必要と確認
- ポイント影響: なし。rewardPointsはnull。残高、付与、レベル、育成処理は未実装
- CSV影響: なし
- Gemini影響: なし。採点処理・呼び出し条件に変更なし。外部API実通信なし
- GAS影響: `C:\Users\netz\student-app-log-gas`のローカルソースのみ変更。`clasp push`、setup実行、デプロイ未実施
- Spreadsheet影響: 実変更なし。将来のM列attemptId、MissionAttempts、DailyMissionProgress追加を想定したコードのみ
- 既存機能影響: `mode: "no-cors"`、既存saveLog送信、認証、SSO、権限制御、採点、復習処理を維持。attemptIdなしのsaveLogは従来どおりログだけを保存
- test結果: 2026-09-02 `npm test` 成功（38件。ローカルE2Eの漢字1/3〜3/3、英単語3教材合算、復習・重複attempt・対象外除外を含む）。ログGAS `node --test コード.test.cjs` 成功（23件。重複排除、英単語・漢字、復習除外、JST日付境界、生徒分離、冪等setupを含む）
- build結果: 2026-09-02 `npm run build` 成功
- lint結果: 変更ファイル対象lint成功。`npm run lint`は既存8件（`App.jsx` 6件、`ChemistryPlayView.jsx` 2件）で失敗し、今回追加エラーなし
- `git diff --check`: 2026-09-02 成功
- ローカル確認: `http://localhost:5173/`のdevelopment限定入口で、定期テスト漢字対策を通常開始し、外部採点・GAS通信なしのセット完了操作からホームへ戻る流れを3回実行。漢字`1 / 3`、`2 / 3`、`3 / 3`と達成表示を実ブラウザで確認。既存CSV重複header警告とHot Reload時の一時的なReact警告を確認したが、今回機能の操作エラーなし
- checkpoint: 小・中学生ホーム刷新を`13e4310`（`feat: redesign junior sukimakun home`）としてローカルcommit
- Version: 4.3.0のまま。Version Historyと共通定数は変更なし
- Commit: ミッション基盤は未commit
- Push / mainマージ / Vercel / GASデプロイ / 本番確認: 未実施

### 小・中学生向けホーム画面刷新（Issue番号未指定）

- 状態: React実装、純粋関数テスト、build、変更箇所lint、PC・tablet・mobileのローカルブラウザ確認まで完了。本番連携確認は未実施
- 変更内容:
  - 小・中学生向けホームを、学習開始を主役とする横長カードUIへ刷新
  - 英語・国語・理科・社会を明示的なcontentId配列で表示分類し、`isContentAllowed` を通過した教材だけを件数と科目別一覧へ反映
  - 合宿3教材の既存 `menuGroup: 'camp'` を維持したまま、表示上のみ国語・理科・社会へ分類
  - 合宿権限がある場合だけ特別モードを表示し、既存 `camp-menu` へ遷移
  - 高校生教材を小・中学生の件数から除外し、権限がある場合の既存高校生モード入口を控えめに維持
  - 科目別教材一覧は `MenuView` 内stateで切り替え、教材開始時は既存 `openContent` と書き単・古文・不規則変化の状態初期化を継続利用
  - ミッション、連続学習、ポイント、育成・ごほうび、最近の学習・復習は、実データを装う数値を出さない「準備中」UIとして追加
  - Liquid Glass風下部ナビをホーム概要だけに表示。ホームのみ活性、記録・ランキング・キャラクター・設定は視覚上およびアクセシビリティ上disabled
  - lucide-reactの学習アイコンを正式キャラクター素材提供前の控えめな代替として使用
  - ホーム専用CSSへスコープし、PC 5列、tablet 3列、mobile 1〜2列、safe area、backdrop-filter fallback、`prefers-reduced-motion` に対応
- CSV影響: なし。CSVファイル、列構成、読込処理に変更なし
- Gemini影響: なし。採点コード、呼び出し条件、回数に変更なし。外部Gemini API実通信なし
- GAS影響: なし。GASソース、保存payload、`saveLog`、`getLogs` に変更なし。GAS実通信なし
- 既存機能影響: `App.jsx`、認証、通常ログイン、uid/tk SSO、CSV読込、採点、ログ保存、復習、CampView、HighSchoolViewは変更なし。教材遷移は既存 `openContent` を再利用
- test結果: 2026-09-02 `npm test` 成功（24件。科目分類の11件・重複なし・存在確認・高校生ID除外・権限別件数・空権限を含む）
- build結果: 2026-09-02 `npm run build` 成功
- lint結果: 2026-09-02 変更3コードファイルの対象lint成功。`npm run lint` は既存8件（`App.jsx` 6件、`ChemistryPlayView.jsx` 2件）で失敗し、今回追加コードの新規エラーなし
- `git diff --check`: 2026-09-02 成功
- ローカル確認: `C:\Users\netz\student-app` で `npm run dev -- --host 127.0.0.1` を実行し、`http://127.0.0.1:5173/` を確認。development限定の既存ローカル確認入口を利用し、外部API通信なしで新ホームを表示
- PC表示確認: 1440×900でヘッダー、ミッション、学習開始、下段2領域、5列科目グリッド定義、Liquid Glassナビ、Versionを確認。横方向のviewport超過なし
- tablet表示確認: 820×1000で科目3列、下段1列、ナビと本文の非重複、横方向のviewport超過なしを確認
- mobile表示確認: 390×844で縦積み、科目1列、下部ナビ5項目、下部padding、横方向のviewport超過なしを確認
- 科目別遷移確認: 前置詞だけを許可したローカル状態で英語1件表示、英語教材一覧への切替、前置詞テスト表示、ホームへ戻る操作を確認。全11教材の実画面遷移は未確認
- ブラウザconsole: errorなし。既存CSVの重複headerに関するPapa Parse warningのみ確認
- 通常ログイン: 未確認
- SSO: 未確認
- Gemini: 実通信未実施
- Commit: 未実施
- Push: 未実施
- mainマージ: 未実施
- 作業ブランチ: `codex/sukimakun-junior-home-renewal`
- Vercelデプロイ: 未実施
- 本番確認: 未実施
- 関連gyoumu-appコミット / Issue: なし。gyoumu-app変更なし
- Version: 4.3.0のまま。共通定数とVersion Historyは変更なし。更新要否はユーザー確認待ち

### 前置詞テスト追加（Issue番号未指定）

- 状態: React実装・CSV追加・自動テスト・build・専用ブランチへの切り分け・push・Vercel Preview生成・development限定のローカル操作確認・ログGAS再デプロイ・実ログ経路での復習リスト表示確認まで完了。`answerDetails` の実ログセル内容と本番画面は未確認
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
  - Vite development時だけ表示されるローカル確認入口を追加し、前置詞テストだけを許可した既存形式の認証状態を生成
  - ローカル確認中の前置詞ログだけをメモリ内へ保存し、既存の復習抽出・克服済み解除処理をGASへ書き込まず操作確認可能にした
  - production buildとPreviewではローカル確認入口・ローカルログ経路を無効化し、通常認証と既存GAS接続を維持
- CSV影響:
  - 変更前: 前置詞CSVなし
  - 変更後: `public/prepositions.csv` を追加（`id`,`English`,`日本語` の3列、指定表の全44行、ID・英語とも重複なし）
  - 既存データへの影響: 既存CSVの列・内容は変更なし。新規IDは表示順やランダム順に依存しない固定値として維持が必要
  - 正式仕様は前置詞44項目。CSV行数、固定ID数、英語項目数がすべて44件であることを確認
- Gemini影響: 呼び出しなし。既存英語・理科・社会のGemini判定条件は変更なし。外部Gemini API実通信なし
- GAS影響: このリポジトリにGASソースがないため変更なし。ログGAS側の `answerDetails` 永続化実装・ローカルテスト・`clasp push`・Webアプリ再デプロイは完了。実際の誤答から復習リストが表示されるログ経路は確認済みで、`answerDetails` 追加列の実セル内容のみ未確認
- build結果: 2026-08-26 `npm run build` 成功（ローカル確認対応後も成功）
- lint結果: 2026-08-26 ローカル確認の変更ファイルを含む対象lint成功。全体lintは既存8件（`App.jsx` 6件、`ChemistryPlayView.jsx` 2件）で失敗し、今回追加コードの新規エラーなし
- test結果: 2026-08-26 `npm test` 成功（21件。既存19件にdevelopment限定判定とローカルログ互換性の2件を追加）
- `git diff --check`: 2026-08-26 成功
- ローカル確認: `npm run dev` でdevelopment限定入口、前置詞カード、両方向、20問の通常テスト、結果画面、方向別復習キー、復習正解後の対象解除を確認。日本語回答 `ーによって` の正解判定を確認。console errorなし。production buildのローカル入口非表示も確認
- 通常ログイン: 未実施
- SSO: 未実施
- Gemini: 実通信未実施
- Commit: `90b0bf6` (`feat: add preposition test`)
- Push: 2026-08-26 `feat/preposition-test` をoriginへpush
- mainマージ: 未実施
- Vercelデプロイ: Git連携によるPreviewデプロイ `dpl_AGv3MThpAbGXygvaZwKS2VGUCYjy` がReady。本番デプロイ未実施
- 本番確認: 未実施
- Version: 4.2.1から4.3.0へ更新。共通定数を利用するログイン画面・ログイン後メニューが対象
- 関連gyoumu-appコミット / Issue: なし。gyoumu-app変更なし

### S-009 問題ジャンル選択UI改善

- 理科・社会ジャンル選択UIを改善。
- チェックボックスと問題ジャンルのレイアウトを共通化し、レスポンシブ対応した。

### S-007 合宿コンテンツ 復習機能・複数分野選択対応

- 状態: 初期実装後、2026-10-28にB改修を独立worktreeで実装・模擬検証し、利用者の主要PC操作確認を受領。その後A/Cと統合し、統合版の利用者主要PC操作合格を受領。Phase ②-4で最終監査・ローカルコミット。push・本番反映は未実施
- B改修基準: GitHub main / ローカルmain / origin/main `715f47d5eab52db71de87e2253ee2a4c1d82a422`。branch `codex/camp-review-local`、worktree `C:/Users/netz/AppData/Local/Temp/student-app-camp-review-20261028`。旧PR #1の一括適用なし
- 変更内容:
  - 合宿の漢字・理科・社会へ、既存ログから要復習問題を取得して一覧表示し、「間違えた問題のみトライ」できる導線を追加
  - 初期仕様は過去誤答を正解後も保持。B改修は合宿3教材の誤答復習を最大20問とし、復習1回正解を `◎` で記録して要復習対象から解除。通常正解 `○` では解除せず、解除後の再誤答 `×` で再登録
  - 理科の復習は教材全体。社会は復習専用の歴史・地理・公民チェック欄で複数選択し、選択範囲内の誤答から合計最大20問。未選択ではログ取得せず案内。通常出題のジャンル・分野選択は維持
  - 合宿復習限定で、固定IDキーと旧問題文キーの履歴を元の `getLogs` 配列・エントリ順に戻して判定。日付解釈・ログ型正規化・推測による問題文対応付け・既存ログMigrationは追加していない。前置詞と通常漢字の履歴規則は維持
  - 復習対象が0件の場合は「現在、間違えた問題はありません。」と表示
  - 理科の問題ジャンルをチェックボックスによる複数選択へ変更
  - 社会の歴史／地理配下の分野をチェックボックスによる複数選択へ変更
  - 理科・社会へ全選択・全解除を追加し、未選択で開始した場合は「最低1件選択してください。」と表示
  - 選択した複数分野の問題をまとめてランダム出題
  - 合宿3コンテンツの復習識別を問題文から `contentId::questionId` の固定キーへ変更
  - 新規ログには問題文を保存せず固定キーを保存し、一覧表示時にCSVの現在の問題文・解答を参照
  - 問題文形式の既存ログは、CSV文言が一致する間は後方互換で読込
- 再利用した既存実装: `getLogs` による履歴取得、`saveLog` による採点後保存、要復習一覧UI、既存手書き入力、理科・社会のReact一次判定と `checkAnswersWithGemini` 一括判定
- 保存方式: 既存のGASログシートと `history` を継続利用。合宿の新規履歴は `contentId::questionId` を保存し、B改修では復習正解のみ `◎` とする。保存列・payload項目・attemptIdの追加なし。localStorage、復習専用CSV、削除処理の追加なし
- CSV影響:
  - 初期実装の変更前: 合宿漢字4列、理科3列、社会4列。固定問題IDなし
  - 初期実装の変更後: 各CSVの先頭へ `id` 列を追加し、行番号・問題文に依存しない固定の不透明IDを全3,655問へ付与
  - 既存データへの影響: ID列以外の全フィールドが変更前と完全一致することを確認。今後は既存行のIDを維持する必要があり、ID変更・再採番・再利用は禁止
  - B改修: CSV列・内容・IDは全て変更なし
- Gemini影響: 採点ロジック、React一次判定、一括判定方式、Gemini呼び出し条件は変更なし。外部Gemini API実通信なし
- GAS影響: B改修ではGASの読取・変更・通信とも未実施。既存契約を維持し、合宿ログの復習正解記号のみ拡張。Spreadsheet・実生徒データ不使用
- build結果: 2026-10-28 `npm run build` 成功
- lint結果: 2026-10-28 `npm run lint` は既存8件で失敗（`App.jsx` 6件、`ChemistryPlayView.jsx` 2件）。B改修による新規lintエラーなし
- test結果: 2026-10-28 `npm test` 67件成功・2件skip・失敗0。B追加31件で3教材0/1/20/21/35件、社会単独/複数/全部、◎解除・○維持・再×登録、旧/新キー混在順序、前置詞・通常漢字回帰、既存保存payload、実採点ハンドラの模擬通信を確認。Reactハンドラを抽出したVMテストでありブラウザE2E・実GAS保存成功の証明ではない
- `git diff --check`: 2026-10-28 成功。追加テスト・モックスクリプトの `node --check` 成功
- ローカル確認: `node scripts/verify-camp-review.mjs --check` でソケットなしのモックmiddleware・API送信先置換・変換後buildを確認。envDir:false、実.env読取なし、CSP connect-src self。既存node_modulesをjunction参照し依存導入なし。サーバー未起動・URL到達未確認。後続操作確認用コマンドは `node scripts/verify-camp-review.mjs`（専用5191、模擬ID local-camp / mock-only）
- C適用確認: Cの実ファイルには未適用。読み取りの `git apply --check` はKanjiTestView.jsxで不適合。改行を揃えた一時コピーの3-way確認では同ファイルの初期化箇所1競合のみ。C/Aの通常復習resetを残してBのmode設定を追加する調整が必要。App.jsx・CampView.jsx・reviewHistory.jsは3-way競合なし。C/A/④の既存差分9/5/4ファイルはSHA-256再照合で全て一致し、各statusも開始時と一致
- 既存機能確認: 全24CSVはmainとバイト一致。Version・ホーム・ログイン・依存定義・Vite設定は改行差を除きmainと一致。単問Gemini・一括採点・手書き判定・通常漢字開始・描画の6ハンドラは基準コードと一致。既存lintとのルール/メッセージ/ファイル比較も8件全て一致
- 統合版追記: 承認済み仕様として、合宿漢字復習もQ1へ初期化し、Cの文字枠/覚えていないと共存。合宿3教材の通常/復習結果から合宿メニューに戻る。統合版は117件成功・2件skip、build成功、新規lintエラーなし。詳細はA・B・C統合版項目を参照。
- 残る確認・対象外: 実GASのgetLogs順序・保存成功、iPad実機、同時利用、本番は未確認。保存は既存no-corsのため成功応答を保証しない。統合版の主要PC操作は利用者確認合格（理科35→33、社会105→95、合宿漢字対象数減少）
- 通常ログイン: 既存単体テストのみ。実認証は未確認
- SSO: 既存単体テストのみ。実認証は未確認
- Gemini: 実通信未実施
- Commit: 初期実装 `feat: add camp review mode and multi-category selection`。B改修はA/C統合版として本コミットに含める
- Push: 初期実装は2026-08-09 `feature/s-007-camp-review` をGitHubへpush。B改修は未push・PR未作成
- mainマージ: 初期実装のマージ `a3131c5` は現在mainの祖先。B改修は未マージ
- Vercelデプロイ: 初期実装は2026-08-09 Git連携Preview成功（READY）。B改修はclasp push・GAS/Vercelデプロイとも未実施
- 本番確認: 未実施
- Version: B改修は指示により4.3.0維持。共通定数・ログイン右下・ホーム右下の表示コード不変。Version History追加なし
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
