import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fmtDate, isIsoDate, normalizeMobile, personalNote, piecesLabel } from '../src/store/format';
import { cardBrand, formatCardNumber, formatExpiry, luhn, parseCallback, parseExpiry, validateCard } from '../src/store/moyasar';

test('saudi mobile numbers normalise to 05XXXXXXXX', () => {
  assert.equal(normalizeMobile('0551234567'), '0551234567');
  assert.equal(normalizeMobile('+966 55 123 4567'), '0551234567');
  assert.equal(normalizeMobile('00966551234567'), '0551234567');
  assert.equal(normalizeMobile('551234567'), '0551234567');
  assert.equal(normalizeMobile('٠٥٥١٢٣٤٥٦٧'), '0551234567');
  assert.equal(normalizeMobile('0451234567'), null);
  assert.equal(normalizeMobile('05512345'), null);
});

test('dates', () => {
  assert.equal(isIsoDate('2026-12-06'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('2026-12-6'), false);
  assert.equal(fmtDate('2026-12-06T10:00:00Z'), '6 / 12 / 2026');
});

test('piece count wording', () => {
  assert.equal(piecesLabel(1), 'قطعة');
  assert.equal(piecesLabel(2), 'قطعتان');
  assert.equal(piecesLabel(5), '5 قطع');
  assert.equal(piecesLabel(11), '11 قطعة');
});

test('personal note only carries what the piece takes', () => {
  const pen = { personal: ['name'] } as never;
  assert.equal(personalNote(pen, { name: 'سارة', nameEn: 'Sara', msg: 'x', from: 'y', date: '2026-12-06' }), 'الاسم: سارة');
  const kit = { personal: ['name', 'date', 'msg', 'from'] } as never;
  assert.equal(personalNote(kit, { name: 'سارة', nameEn: '', msg: 'فخورين', from: 'أهلك', date: '' }), 'الاسم: سارة · الرسالة: فخورين · من: أهلك');
});

test('card checks', () => {
  assert.equal(luhn('4111 1111 1111 1111'), true);
  assert.equal(luhn('4111 1111 1111 1112'), false);
  assert.equal(luhn('1234'), false);
  assert.equal(cardBrand('4111'), 'visa');
  assert.equal(cardBrand('5555'), 'mastercard');
  assert.equal(cardBrand('5888 45'), 'mada');
  assert.equal(formatCardNumber('4111111111111111'), '4111 1111 1111 1111');
  assert.equal(formatExpiry('1229'), '12 / 29');
  assert.equal(parseExpiry('13 / 29'), null);
  assert.equal(parseExpiry('01 / 20'), null);
  const far = String((new Date().getFullYear() + 3) % 100).padStart(2, '0');
  assert.deepEqual(parseExpiry(`12 / ${far}`), { month: '12', year: String(new Date().getFullYear() + 3) });
  assert.deepEqual(validateCard({ number: '4111111111111111', name: 'SARA ALQAHTANI', expiry: `12 / ${far}`, cvc: '123' }), {});
  assert.ok(validateCard({ number: '4111', name: 'سارة', expiry: '', cvc: '1' }).number);
  assert.ok(validateCard({ number: '4111111111111111', name: 'سارة القحطاني', expiry: `12 / ${far}`, cvc: '123' }).name);
});

test('moyasar callback parsing', () => {
  const cb = 'https://shop.ranlab.dev/wrk-app-return?order=15';
  assert.deepEqual(parseCallback(cb + '&id=abc-123&status=paid&message=APPROVED', cb), { paymentId: 'abc-123', paid: true, message: 'APPROVED' });
  assert.deepEqual(parseCallback(cb + '&id=abc-123&status=failed&message=DECLINED+BY+BANK', cb), { paymentId: 'abc-123', paid: false, message: 'DECLINED BY BANK' });
  assert.equal(parseCallback('https://bank.example/3ds?id=1&status=paid', cb), null);
  assert.equal(parseCallback(cb, cb), null);
});
