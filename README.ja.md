# ccrunner

YAMLファイルで定義された一連のタスクを自動実行するツールです。Claude Codeを使用してAIプロンプトを実行したり、Bashコマンドを実行したり、ループ処理を行ったりすることができます。レート制限に達した時は解除まで自動で待機します。

## セットアップ

### グローバルインストール

```bash
npm install -g @hyshu/ccrunner
```

### ローカル開発用インストール

```bash
git clone https://github.com/hyshu/ccrunner.git
cd ccrunner
npm install
npm link
```

### アンインストール

```bash
npm uninstall -g @hyshu/ccrunner
```

## 使用方法

### npxでクイックスタート（インストール不要）

```bash
# デフォルトのrunner.yamlを実行
npx @hyshu/ccrunner

# 特定のYAMLファイルを実行
npx @hyshu/ccrunner examples/simple.yaml
```

### グローバルインストール後の使用

```bash
# デフォルトのrunner.yamlを実行
ccrunner

# 特定のYAMLファイルを実行
ccrunner examples/simple.yaml
```

### 開発モード（ファイル監視付き）

```bash
npm run dev examples/simple.yaml
```

## YAML設定リファレンス

### ルート設定

| オプション | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `name` | string | **必須** | タスクの名前 |
| `description` | string | 任意 | タスクの説明 |
| `version` | string | 任意 | バージョン識別子 |
| `variables` | object | 任意 | キーと値のペアによるグローバル変数 |
| `steps` | array | **必須** | 実行するステップの配列 |
| `yolo` | boolean | 任意 | trueの場合、toolsが定義されていないプロンプトで全てのツールを許可（デフォルト: false） |

例：
```yaml
name: My Task

steps:
  - type: command
    command: echo "Hello"
  - type: prompt
    prompt: Hello
```

YOLOモードの例：
```yaml
name: My Task
yolo: true  # toolsが未定義のプロンプトで全ツールを許可
steps:
  - type: prompt
    prompt: ファイルを読み書きして必要な作業を全て行ってください
    # toolsを省略したが、yolo: trueにより全ツールが使用可能
    
  - type: prompt
    prompt: ファイルの読み取りのみ行い、書き込みは行わないでください
    tools: ["Read", "LS"]  # yolo: trueでも、toolsを明示的に指定した場合は制限される
```

### ステップタイプ

3種類のステップがあります：

1. **prompt** - Claude Code AIプロンプトを実行
2. **command** - bashコマンドを実行
3. **loop** - 配列の反復処理や条件付きループ

#### 共通ステップオプション

すべてのステップタイプで以下のオプションが使用可能です：

| オプション | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `type` | string | **必須** | ステップタイプ: `prompt`、`command`、または `loop` |
| `name` | string | 任意 | ステップの人間が読める名前 |
| `description` | string | 任意 | ステップの動作説明 |
| `continueOnError` | boolean | 任意 | ステップが失敗しても実行を継続（デフォルト: true） |
| `condition` | string | 任意 | 評価する条件；Bashの場合は`[式]`、それ以外はJavaScript |

### プロンプトステップ

オプションのツール制限付きでClaude Code AIプロンプトを実行します。

#### オプション：

| オプション | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `prompt` | string | **必須** | Claudeに送信するプロンプトテキスト |
| `model` | string | 任意 | 使用するモデル（例: "claude-opus-4-20250514"） |
| `maxTurns` | number | 任意 | 最大会話ターン数（1以上である必要があります） |
| `tools` | string[] | 任意 | Claudeが使用できるツール名の配列。省略した場合はツールが使用不可（yoloモードが有効な場合を除く） |
| `workingDirectory` | string | 任意 | Claude Code実行時の作業ディレクトリを設定 |
| `saveResultAs` | string | 任意 | 結果を保存する変数名 |
| `continueFrom` | string | 任意 | 以前のプロンプトから継続：プロンプト名、"before"（直前のプロンプト）、またはセッションIDを指定 |

#### 利用可能なツール：
- `Task` - 複雑な操作のためのサブエージェントを起動
- `Bash` - シェルコマンドを実行
- `Glob` - ファイルパターンマッチング
- `Grep` - コンテンツ検索
- `LS` - ディレクトリ内容をリスト
- `Read` - ファイル内容を読み取り
- `Edit` - ファイル内のテキストを置換
- `MultiEdit` - 1回の操作で複数の編集
- `Write` - ファイルの作成/上書き
- `NotebookRead` - Jupyterノートブックを読み取り
- `NotebookEdit` - Jupyterノートブックを編集
- `WebFetch` - Webコンテンツの取得と処理
- `WebSearch` - Web検索
- `TodoRead` - TODOリストを読み取り
- `TodoWrite` - TODOリストを管理
- `exit_plan_mode` - プランニングモードを終了

例：
```yaml
# 特定のツールのみを許可
- type: prompt
  name: コンポーネント生成
  prompt: ユーザー認証用のReactコンポーネントを作成してください
  model: claude-opus-4-20250514
  maxTurns: 5
  tools: ["Write", "Edit", "Read"]
  saveResultAs: componentCode
```
```yaml
# ツールを使用しない（toolsパラメータを省略）
- type: prompt
  name: 質問への回答
  prompt: 再帰の概念を説明してください
  model: claude-opus-4-20250514
  saveResultAs: explanation
```
```yaml
# 名前付きプロンプトから継続
- type: prompt
  name: SetupProject
  prompt: TypeScriptを使用した新しいNode.jsプロジェクトを作成してください

- type: prompt
  name: テスト追加
  prompt: プロジェクトにユニットテストを追加してください
  continueFrom: SetupProject
```
```yaml
# 直前のプロンプトから継続
- type: prompt
  name: 初期作業
  prompt: Reactコンポーネントを作成してください

- type: prompt
  name: 作業継続
  prompt: コンポーネントにスタイリングを追加してください
  continueFrom: before
```
```yaml
# セッションIDで以前のセッションから継続
- type: prompt
  name: 開発の継続
  prompt: 前のタスクを続けて作業してください
  continueFrom: aa4e7d0a-6011-4246-8072-a7189546c6f6
  maxTurns: 5
```
```yaml
# Claude Codeの作業ディレクトリを設定
- type: prompt
  name: プロジェクト分析
  prompt: プロジェクト構造を分析してください
  workingDirectory: "/Users/me/Projects/my-app"
  tools: ["Read", "LS", "Grep"]
```

### コマンドステップ

オプションのタイムアウトと作業ディレクトリを使用してbashコマンドを実行します。

#### オプション：

| オプション | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `command` | string | **必須** | 実行するbashコマンド |
| `timeout` | number | 任意 | コマンドタイムアウト（ミリ秒、0以上である必要があります） |
| `workingDirectory` | string | 任意 | コマンドを実行するディレクトリ |
| `saveResultAs` | string | 任意 | コマンド出力を保存する変数名 |

例：
```yaml
- type: command
  name: 依存関係のインストール
  command: npm install
  timeout: 60000
  workingDirectory: ./my-app
  saveResultAs: installResult
```

### ループステップ

配列の反復処理や条件付きループを実行します。

#### オプション：

| オプション | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `steps` | array | **必須** | ループ内で実行するステップの配列 |
| `condition` | string | 任意 | while形式のループのループ条件 |
| `maxIterations` | number | 任意 | 最大反復回数（デフォルト: 100、1以上である必要があります） |
| `iterateOver` | string | 任意 | 反復処理する配列を含む変数 |
| `itemVariable` | string | 任意 | 現在のアイテムの変数名 |
| `indexVariable` | string | 任意 | 現在のインデックスの変数名 |

例 - 配列の反復処理：
```yaml
variables:
  files: ["index.ts", "app.ts", "config.ts"]

steps:
  - type: loop
    name: ファイル処理
    iterateOver: files
    itemVariable: currentFile
    indexVariable: fileIndex
    steps:
      - type: command
        command: echo "ファイル ${fileIndex} を処理中: ${currentFile}"
```

例 - 条件付きループ：
```yaml
variables:
  counter: 0

steps:
  - type: loop
    name: 10回繰り返す
    condition: "${counter < 10}"
    steps:
      - type: command
        command: expr ${counter} + 1
        saveResultAs: counter
```

### 変数システム

#### 変数の置換

任意の文字列フィールドで`${variableName}`構文を使用して変数を置換します：

- 単純な変数: `${projectName}`
- ネストされたオブジェクト: `${config.database.host}`
- 配列アクセス: `${files[0]}`
- JavaScript式: `${new Date().getFullYear()}`
- 結果アクセス: `${results['my-step']?.output}`

#### 利用可能な変数

実行中、以下の変数が利用可能です：

| 変数 | スコープ | 説明 |
|------|---------|------|
| `variables` | グローバル | 定義されたすべての変数 |
| `results` | グローバル | 前のステップの結果（ステップ名でキー付け） |
| `currentItem` | ループのみ | 反復処理中の現在のアイテム |
| `currentIndex` | ループのみ | 反復処理中の現在のインデックス |
| `currentIteration` | ループのみ | 現在の反復回数（0ベース） |

#### 結果の保存

`saveResultAs`を使用してステップの結果を後で使用するために保存します：

```yaml
steps:
  - type: command
    name: get-version
    command: cat package.json | jq -r .version
    saveResultAs: packageVersion
    
  - type: prompt
    prompt: バージョン ${results['get-version']?.output} のchangelogを更新してください
```

### 条件付き実行

`condition`フィールドを使用してステップを条件付きで実行します：

#### 条件の種類

**Bash条件**（`[` と `]`で囲む）:
```yaml
steps:
  - type: prompt
    condition: "[ -f config.json ]"
    prompt: 設定ファイルを処理する
    
  - type: loop
    condition: "[ ${counter} -lt 10 ]"
    steps:
      - type: command
        command: echo $((${counter} + 1))
        saveResultAs: counter
```

**JavaScript条件**（括弧なし）:
```yaml
steps:
  - type: command
    command: test -f config.json
    continueOnError: true
    saveResultAs: configExists
    
  - type: prompt
    condition: "${!results.configExists?.success}"
    prompt: デフォルトのconfig.jsonファイルを作成してください
    
  - type: loop
    condition: "${counter < 10}"
    steps:
      - type: command
        command: expr ${counter} + 1
        saveResultAs: counter
```

一般的なBash条件演算子：
- `-f file`: ファイルが存在する
- `-d directory`: ディレクトリが存在する
- `-s file`: ファイルが存在し、空でない
- `-z string`: 文字列が空
- `-n string`: 文字列が空でない
- `"$var" = "value"`: 文字列の等価
- `"$var" != "value"`: 文字列の不等価
- `$var -eq value`: 数値の等価
- `$var -lt value`: 数値の小なり
- `$var -gt value`: 数値の大なり

### エラーハンドリング

デフォルトでは、ステップが失敗してもランナーは実行を継続します。エラーで停止するには、`continueOnError: false`を設定します：

```yaml
steps:
  - type: command
    command: rm 存在しないファイル
    continueOnError: false  # このステップが失敗した場合、実行を停止
    
  - type: prompt
    prompt: 前のステップが成功した場合のみ実行されます
```

## 完全な例

```yaml
name: フルスタックアプリジェネレーター
description: 完全なフルスタックアプリケーションを生成
version: "1.0.0"

variables:
  appName: "my-fullstack-app"
  components: ["Header", "Footer", "Dashboard"]
  apiEndpoints:
    - name: "users"
      methods: ["GET", "POST", "PUT", "DELETE"]
    - name: "products"
      methods: ["GET", "POST"]

steps:
  # プロジェクト構造のセットアップ
  - type: command
    name: create-directories
    command: mkdir -p ${appName}/{client,server,shared}
    saveResultAs: setupResult

  # バックエンドの生成
  - type: prompt
    name: generate-backend
    condition: "${setupResult.success}"
    prompt: |
      serverディレクトリにTypeScriptを使用したExpress.jsサーバーを作成してください。
      以下のエンドポイントを含めてください: ${JSON.stringify(variables.apiEndpoints)}
    tools: ["Write", "Edit", "Bash"]
    maxTurns: 10
    saveResultAs: backendResult

  # フロントエンドコンポーネントの生成
  - type: loop
    name: generate-components
    iterateOver: components
    itemVariable: componentName
    indexVariable: componentIndex
    steps:
      - type: prompt
        name: create-${componentName}
        prompt: |
          ${componentName}という名前のReactコンポーネントを
          client/components/${componentName}.tsxに作成してください
        tools: ["Write", "Read"]
        condition: "${componentIndex < 10}"

  # セットアップとテスト
  - type: command
    name: install-dependencies
    command: cd ${appName} && npm init -y && npm install
    timeout: 120000
    continueOnError: true

  # 最終ドキュメント
  - type: prompt
    name: create-docs
    prompt: |
      以下を文書化するREADME.mdファイルを作成してください：
      - アプリケーションの実行方法
      - 作成されたAPIエンドポイント
      - コンポーネント構造
    tools: ["Write", "Read"]
    condition: "${backendResult.success}"
```

## 開発

### TypeScriptのビルド

```bash
npm run build
```

### 型チェック

```bash
npm run typecheck
```

## レート制限の処理

Claude AIの使用制限に達した場合、エージェントランナーは自動的に以下を行います：

1. **レート制限エラーの検出** - `Claude AI usage limit reached|<unix_timestamp>` 形式のメッセージを識別
2. **待機時間の計算** - レート制限がリセットされるまでの待機時間を計算
3. **進捗の表示** - 10秒ごとに残り待機時間を更新表示
4. **自動リトライ** - レート制限期間が終了したら実行を再開
5. **複数回のリトライ対応** - レート制限が続く場合、最大3回までリトライ

レート制限時の出力例：
```
⏳ Claude AI usage limit reached. Waiting until 2025-01-14 10:00:00 (approximately 15 minutes)...
⏳ Waiting... 12 minutes remaining
✅ Rate limit period ended. Retrying...
```

## 制限事項

- 現在、型チェックで一部の警告が表示されますが、実行には影響しません
- Claude Codeの実行にはClaude Maxのサブスクリプションまたは APIキー（環境変数 `CLAUDE_API_KEY`）が必要です
  - 注：Claude Max の場合、表示されるCostは実際には請求されません