// 500 алдааг хэрэглэгчид задруулахгүй: серверийн лог руу бичээд ерөнхий мессеж буцаана
function serverError(res, err) {
  console.error(err);
  return res.status(500).json({ error: 'Серверийн алдаа гарлаа. Дахин оролдоно уу' });
}
module.exports = { serverError };
