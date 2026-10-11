-- ============================================================
-- Туршилтын өгөгдөл (Test Data)
-- ============================================================

-- Компани
INSERT INTO companies (id, name, phone, address) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Монгол Авто ХХК', '99001122', 'УБ, Сүхбаатар дүүрэг');

-- Хэрэглэгч (нууц үг: password123 → bcrypt хийнэ)
INSERT INTO users (company_id, name, email, password, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Админ Батаа',   'admin@mongolauto.mn',  '$2b$10$xxx', 'ADMIN'),
    ('11111111-1111-1111-1111-111111111111', 'Борлуулагч Дорж', 'sales@mongolauto.mn', '$2b$10$xxx', 'SALES'),
    ('11111111-1111-1111-1111-111111111111', 'Санхүүч Нара',  'finance@mongolauto.mn','$2b$10$xxx', 'FINANCE');

-- Машин
INSERT INTO vehicles (id, company_id, vin, brand, model, year, mileage, color, status) VALUES
    ('aaaaaaaa-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'JT2BF22K1W0123456', 'Toyota',  'Camry',  2022, 15000, 'Цагаан',  'PUBLISHED'),
    ('aaaaaaaa-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'KMHD041BBFU123456', 'Hyundai', 'Tucson', 2023, 5000,  'Хар',    'ARRIVED'),
    ('aaaaaaaa-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', '1HGCM82633A123456', 'Honda',   'CR-V',   2021, 30000, 'Мөнгөлөг', 'SOLD');

-- Зардлууд (Toyota Camry)
INSERT INTO vehicle_costs (vehicle_id, cost_type, amount, currency, note) VALUES
    ('aaaaaaaa-0001-0001-0001-000000000001', 'PURCHASE', 25000000, 'MNT', 'Япон дахь авсан үнэ'),
    ('aaaaaaaa-0001-0001-0001-000000000001', 'SHIPPING',  1500000, 'MNT', 'Тээврийн зардал'),
    ('aaaaaaaa-0001-0001-0001-000000000001', 'CUSTOMS',   3200000, 'MNT', 'Гаалийн татвар'),
    ('aaaaaaaa-0001-0001-0001-000000000001', 'CLEANING',   150000, 'MNT', 'Угаалга');

-- Үйлчлүүлэгч
INSERT INTO customers (company_id, name, phone, register) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Болд Мэнд', '88001122', 'УБ12345678');

-- Борлуулалт (Honda CR-V)
INSERT INTO sales (company_id, vehicle_id, customer_id, sale_price, payment_type) VALUES
    ('11111111-1111-1111-1111-111111111111',
     'aaaaaaaa-0001-0001-0001-000000000003',
     (SELECT id FROM customers LIMIT 1),
     32000000, 'CASH');
