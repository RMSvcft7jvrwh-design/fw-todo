# やること管理アプリ DB設計書

この文書は [要件定義書](requirements.md) と [配られた仕様書](handout_app_spec.md) に基づく。DB（データベース。情報を保存する場所）には `todos` テーブル（同じ種類のデータを行で並べる場所）を1つだけ作る。やること1件を1行として保存する。

## 1. テーブルの概要

| 項目 | 設計 |
|---|---|
| テーブル名 | `todos` |
| 保存する単位 | やること1件につき1行 |
| 主キー（一行を一意に見分ける値） | `id` |
| カラム（表の縦の項目）の数 | 10 |

## 2. カラム一覧と要件との対応

`NULL` は「値が入っていない」状態を表す。型は、保存できる値の種類を表す。

| カラム | 保存するもの | 型 | NULL可 | 自動設定・値の決まり | 対応する要件 |
|---|---|---|---|---|---|
| `id` | 1件を見分ける番号 | `BIGINT` | 不可 | 主キー。1件追加するたびに自動で増やす。入力欄には出さない。 | 要件定義書 3「保存する情報」の `id`、2「編集・削除」、6「存在しない番号の扱い・記録」 |
| `title` | やること | `VARCHAR(255)` | 不可 | 255文字以内。空白だけの入力はアプリで止める。 | 要件定義書 3 の `title`、4.2「一覧」、4.3「登録・編集」、5.1「入力の確認」、5.2「名前の絞り込み」 |
| `detail` | メモ | `VARCHAR(255)` | 可 | 255文字以内。未入力を許す。 | 要件定義書 3 の `detail`、4.3「登録・編集」、5.1「入力の確認」 |
| `category` | ジャンル | `VARCHAR(255)` | 不可 | 「デザイン」「マーケティング」「プログラミング」「資格」「就職活動」のいずれか。 | 要件定義書 3 の `category`、4.2「一覧」、4.3「登録・編集」、5.1「入力の確認」、5.2「ジャンルの絞り込み」 |
| `priority` | 優先度 | `INT` | 不可 | 1＝高、2＝中、3＝低。既定値（指定がないときにDBが入れる値）は2。 | 要件定義書 3 の `priority`、4.2「一覧」、4.3「登録・編集」、5.1「入力の確認」 |
| `due_date` | 期限 | `DATE` | 可 | 未入力を許す。 | 要件定義書 3 の `due_date`、4.2「一覧」、4.3「登録・編集」、5.2「期限順の並び替え」 |
| `completed` | 完了状態 | `BOOLEAN` | 不可 | 0＝未完了、1＝完了。既定値は0。 | 要件定義書 3 の `completed`、4.2「状態の表示」、4.3「編集時の完了チェック」 |
| `completed_at` | 完了した日時 | `DATETIME` | 可 | 未完了から完了に変わったときの日本時間。以前から完了済みの行は日時不明のためNULLのまま。 | Chapter 15-7「Todoの完了日時」 |
| `created_at` | 登録した日時 | `DATETIME` | 不可 | MySQLが登録時に自動で入れる。入力欄には出さない。 | 要件定義書 3 の `created_at` |
| `updated_at` | 最後に直した日時 | `DATETIME` | 不可 | MySQLが登録時に入れ、更新時に自動で入れ直す。入力欄には出さない。 | 要件定義書 3 の `updated_at` |

## 3. テーブルを作る SQL

次は MySQL 用の DDL（テーブルの形を作る SQL 文）である。`AUTO_INCREMENT` は番号の自動採番、`DEFAULT` は既定値、`CHECK` は保存できる値の制限を表す。

```sql
CREATE TABLE todos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    detail VARCHAR(255) NULL,
    category VARCHAR(255) NOT NULL,
    priority INT NOT NULL DEFAULT 2,
    due_date DATE NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_todos_category CHECK (category IN (
        'デザイン', 'マーケティング', 'プログラミング', '資格', '就職活動'
    )),
    CONSTRAINT chk_todos_priority CHECK (priority IN (1, 2, 3)),
    CONSTRAINT chk_todos_completed CHECK (completed IN (0, 1))
);
```

## 4. 保存と利用の決まり

- 登録時に利用者が入力するのは `title`、`detail`、`category`、`priority`、`due_date`。編集時には `completed` も変更できる。`id`、`completed_at`、`created_at`、`updated_at` は利用者に入力させない。
- `priority` にDBの既定値2があっても、登録・編集画面では優先度を選ばなければ保存しない。DBの既定値と画面の入力確認は役割が異なる。
- `title` が空欄・空白だけの場合、また必須項目が未選択の場合はアプリで保存を止める。`NOT NULL`（値なしを禁止する指定）だけでは空文字や空白だけを止められない。
- 一覧では `title`、`category`、`priority`、`due_date`、`completed` を使う。`title` は文字を一部含むか、`category` は値が一致するかで絞り込む。`due_date` で期限順に並べる。
- 編集・削除する1件の特定と、操作のログ（動作の記録）には `id` を使う。ログには操作名と `id` だけを残し、`title` と `detail` の中身は残さない。ログ用のテーブルは作らない。
