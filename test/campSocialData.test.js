import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Papa from 'papaparse';

const EXPECTED_CIVICS_GENRE_COUNTS = Object.freeze({
  '現代社会・日本国憲法と人権の尊重': 60,
  '政治のしくみ': 20,
  '民主政治と選挙': 5,
  '国会': 7,
  '内閣': 7,
  '裁判所・三権分立': 13,
  '地方自治': 8,
  '消費生活と流通、市場経済と価格、生産と企業': 20,
  '金融のしくみ、政府の仕事と租税・財政': 24,
  '社会保障制度・労働者の権利、今日の日本経済と公害・環境': 16,
  '国際社会と世界平和': 37,
  '人口、資源・エネルギー、地球環境問題': 23
});

const loadCampSocialRows = async () => {
  const csv = await readFile(new URL('../public/camp-social.csv', import.meta.url), 'utf8');
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.meta.fields, ['id', '歴史or地理', '分野', '問題', '解答']);
  return parsed.data;
};

test('camp social CSV contains complete history, geography, and civics data', async () => {
  const rows = await loadCampSocialRows();
  const subjectCounts = Object.fromEntries(
    [...new Set(rows.map((row) => row['歴史or地理']))]
      .map((subject) => [subject, rows.filter((row) => row['歴史or地理'] === subject).length])
  );
  const ids = rows.map((row) => row.id);

  assert.equal(rows.length, 703);
  assert.deepEqual(subjectCounts, { '歴史': 300, '地理': 163, '公民': 240 });
  assert.equal(ids.every(Boolean), true);
  assert.equal(new Set(ids).size, rows.length);
  assert.equal(ids.every((id) => /^csoc_[0-9a-f]{32}$/.test(id)), true);
});

test('civics rows have all required fields and the expected 12 genres', async () => {
  const rows = await loadCampSocialRows();
  const civicsRows = rows.filter((row) => row['歴史or地理'] === '公民');
  const genreCounts = Object.fromEntries(
    Object.keys(EXPECTED_CIVICS_GENRE_COUNTS)
      .map((genre) => [genre, civicsRows.filter((row) => row['分野'] === genre).length])
  );

  assert.equal(civicsRows.length, 240);
  assert.equal(new Set(civicsRows.map((row) => row['分野'])).size, 12);
  assert.deepEqual(genreCounts, EXPECTED_CIVICS_GENRE_COUNTS);
  assert.equal(
    civicsRows.every((row) => ['id', '歴史or地理', '分野', '問題', '解答']
      .every((column) => String(row[column] || '').trim() !== '')),
    true
  );
});
