# NR Grader

React + TypeScript + Vite frontend สำหรับ `../grader-api` (NestJS / Prisma / MySQL) แยกจากโปรเจกต์เดิมทั้งหมด

## เริ่มใช้งานในเครื่อง

ใช้ Node.js 22.12+ หรือ 24 และเปิด backend ที่พอร์ต 3100 ตาม README ของ `grader-api` ก่อน

```powershell
cd nr-grader
npm install
npm run dev
```

เปิด **http://localhost:5173** — Vite ส่งคำขอ `/api` ไปที่ `http://127.0.0.1:3100` ให้โดยอัตโนมัติ

เฉพาะ development จะอ่าน **GOOGLE_CLIENT_ID ที่เป็นค่าสาธารณะ** จาก `../grader-api/.env` เมื่อไม่ได้ตั้ง `VITE_GOOGLE_CLIENT_ID` ใน frontend จึงใช้ Client ID ที่ตั้งไว้แล้วได้ ไม่อ่าน DB password หรือ JWT secret ไปใส่ในเว็บ

หากต้องการเปลี่ยนค่า ให้สร้าง `.env.local` โดยอ้างอิง `.env.example`:

```dotenv
VITE_API_URL=/api
VITE_GOOGLE_CLIENT_ID=YOUR_PUBLIC_CLIENT_ID.apps.googleusercontent.com
API_PROXY_TARGET=http://127.0.0.1:3100
```

หลังแก้ env ต้อง restart Vite ค่า `VITE_*` เป็นข้อมูลสาธารณะที่ผู้ใช้เว็บอ่านได้ **ห้ามใส่ Google Client Secret, JWT_SECRET หรือ DATABASE_URL**

## Google Login

ใช้ Google Identity Services รับ ID token แล้วส่ง `POST /api/auth/google` ให้ backend ตรวจสอบ จากนั้นใช้ JWT ของระบบเรียก API

- ใช้ OAuth client ประเภท Web application และ Client ID เดียวกับ backend
- เพิ่ม `http://localhost` และ `http://localhost:5173` ใน Authorized JavaScript origins ตาม [คู่มือตั้งค่า Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) แล้วใช้ localhost เปิดเว็บ
- production ต้องเพิ่ม HTTPS origin ของ frontend จริงด้วย
- ถ้า consent screen จำกัดเฉพาะ test users ต้องเพิ่มบัญชีที่จะใช้ทดสอบ
- flow นี้ใช้ JavaScript callback รับ ID token ไม่ใช่ authorization-code redirect flow
- สิทธิ์ Admin มาจาก backend / `ADMIN_EMAILS` เท่านั้น ไม่เลือกหรือยกระดับสิทธิ์จากหน้าเว็บ

JWT เก็บใน `sessionStorage` ของแท็บ ล้างเมื่อ logout หรือ API ตอบ 401; ฉบับร่างโค้ดเก็บใน `localStorage` แยกตามบัญชี/โจทย์/ภาษา/การแข่งขัน บนเครื่องส่วนรวมควรล้างข้อมูลเว็บไซต์เมื่อเลิกใช้

## หน้าที่ทำแล้ว

- Google Login และ route สำหรับ User / Admin
- คลังโจทย์: ค้นหา กรองความยาก/ภาษา/สถานะ พร้อมสถิติจากการส่งล่าสุดสูงสุด 100 ครั้ง
- หน้าโจทย์ Markdown พร้อม input/output ตัวอย่าง ข้อจำกัดเวลาและหน่วยความจำ
- CodeMirror สำหรับ C++ / Python, syntax highlighting, ฉบับร่างแยกภาษา และส่งโค้ดจริงไป API
- ประวัติและผลตรวจรายเทสเคส อัปเดตผลอัตโนมัติทุก 3 วินาทีระหว่างรอตรวจ
- การแข่งขัน: ตารางเวลา สมัครเข้าร่วม โจทย์ตามช่วงเวลา และตารางอันดับพร้อมปุ่มรีเฟรช
- Admin: สร้าง/แก้ไข/เผยแพร่/เก็บโจทย์, อัปโหลดคู่ไฟล์ `.in`/`.sol` ไม่เกินไฟล์ละ 2 MB, คะแนนและตัวอย่าง/เทสลับ
- Admin: สร้างการแข่งขัน เลือกโจทย์และน้ำหนักคะแนน เผยแพร่/ปิดการแข่งขัน
- รองรับมือถือ, สถานะกำลังโหลด/ข้อมูลว่าง/ข้อผิดพลาด, retry, session หมดอายุ

ไม่มีข้อมูลจำลองหรือการข้าม Login ใน production ข้อมูลทดสอบอยู่เฉพาะ `tests/` และไม่ถูกรวมใน build

## ทดสอบ

```powershell
npm test
npm run test:e2e
npm run build
```

- Vitest + Testing Library ทดสอบ auth, permissions, filtering, errors, drafts, payloads และขอบเขตเวลาแข่งขัน
- Playwright ใช้ Microsoft Edge แบบ headless โดยปริยาย ทดสอบ desktop/mobile พร้อมภาพที่ `test-results/` และ intercept API เฉพาะใน browser context ของการทดสอบ ไม่เขียนฐานข้อมูลจริง
- E2E build แล้วเปิด production preview ที่พอร์ต 5174 โดยไม่อ่าน Google Client ID จาก backend (พอร์ต 5174 ต้องว่าง)
- ถ้าเครื่องไม่มี Edge: ติดตั้ง Chromium ด้วย `npx playwright install chromium` แล้วตั้ง `PLAYWRIGHT_CHANNEL=chromium` ก่อนรัน

การทดสอบจำลอง API **ไม่ใช่** การยืนยัน Login ด้วยบัญชี Google จริง หรือผลรัน Piston จริง ซึ่งต้องทดสอบหลังตั้งค่า origin/runner พร้อมแล้ว

ผลตรวจ: unit/integration 11 รายการ และ browser desktop/mobile 16 รายการผ่าน, production build ผ่าน ปุ่ม Google แสดงได้ด้วย Client ID ที่ตั้งไว้ แต่ Google แจ้ง `The given origin is not allowed for the given client ID` ที่ `http://localhost:5173` จึงต้องเพิ่ม origin ใน Google Cloud ก่อนล็อกอินจริง ขณะตรวจยังไม่ได้เปิด backend ที่พอร์ต 3100

## Build / deploy บน server เดิม

1. ตั้ง `VITE_GOOGLE_CLIENT_ID` และ `VITE_API_URL` ใน env ของ frontend **ก่อน build** production จะไม่อ่าน env จากโฟลเดอร์ backend ให้อัตโนมัติ
2. รัน `npm ci` และ `npm run build` แล้วนำ **เฉพาะเนื้อหา `dist/`** ไปไว้ใน document root ของโดเมน frontend ไม่อัปโหลด env, source หรือ node_modules ไป document root
3. ตั้ง static hosting ให้ route ของ React กลับไปที่ `index.html`; ยกเว้น `/api` ต้องส่งไป NestJS และ assets ที่ไม่มีจริงควรตอบ 404
4. หาก frontend/API คนละ origin ให้ตั้ง `VITE_API_URL=https://API_HOST/api` และเพิ่ม frontend origin ใน CORS ของ backend พร้อม HTTPS ทั้งคู่
5. ตรวจสอบ MySQL, backend และ Piston แยกต่างหาก การนำ frontend ขึ้น server ไม่ได้ติดตั้งหรือทำให้ Piston พร้อมใช้งานเอง

ตัวอย่าง Nginx ภายใน server block ของ **โดเมน frontend ใหม่** (ปรับ document root/upstream ให้ตรงเครื่องจริง ไม่แทน config ของเว็บเดิม):

```nginx
root /PATH/TO/NR-GRADER/dist;
index index.html;

location /api/ {
    proxy_pass http://127.0.0.1:3100;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 5m;
}
location /assets/ {
    try_files $uri =404;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
location / {
    try_files $uri $uri/ /index.html;
    add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

CodeMirror และหน้า Admin แยกโหลดเมื่อเข้าใช้งาน Font ไทยโหลดจาก Google Fonts โดยมี Tahoma/system font สำรอง จึงควรอนุญาต `fonts.googleapis.com`, `fonts.gstatic.com` และ Google Identity Services หาก server มี CSP

Google Sign-In ที่ไม่ได้ใช้ FedCM ต้องให้หน้า **frontend** ส่ง `Cross-Origin-Opener-Policy: same-origin-allow-popups` เพื่อให้ popup ส่งผลกลับได้ ซึ่งตั้งไว้แล้วสำหรับ Vite development/preview ข้างต้น ส่วน production ต้องตั้งใน reverse proxy/static host ตามตัวอย่าง Nginx ไม่ต้องลดค่า COOP ของ API เพียงเพราะใช้ Google Login

ตรวจเฉพาะการแสดงปุ่ม Google บน dev server โดยไม่เข้าสู่ระบบได้ด้วย `node scripts/check-google-button.mjs` หาก popup ถูกบล็อก ให้ตรวจ COOP/CSP ตาม [ข้อกำหนดของ Google](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#cross_origin_opener_policy)
