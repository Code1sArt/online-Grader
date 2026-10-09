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
- Playground สำหรับทดลองรัน C++ / Python พร้อม stdin, stdout, compiler/runtime diagnostics และฉบับร่างในเครื่อง
- ประวัติและผลตรวจรายเทสเคส อัปเดตผลอัตโนมัติทุก 3 วินาทีระหว่างรอตรวจ
- การแข่งขัน: ตารางเวลา สมัครเข้าร่วม โจทย์ตามช่วงเวลา และตารางอันดับพร้อมปุ่มรีเฟรช
- Subtask: แบ่งเทสตามขนาดข้อมูล ให้คะแนนเมื่อผ่านครบกลุ่ม แสดงเวลาและ peak memory รายกลุ่ม; รองรับคะแนนรายเทสของโจทย์เดิม
- Admin: สร้าง/แก้ไข/เผยแพร่/เก็บโจทย์, อัปโหลดคู่ไฟล์ `.in`/`.sol` ไม่เกินไฟล์ละ 10 MB, คะแนนและตัวอย่าง/เทสลับ
- Admin: สร้างการแข่งขัน เลือกโจทย์และน้ำหนักคะแนน เผยแพร่/ปิดการแข่งขัน
- Admin: เปิดหรือปิด Playground จากหน้าตั้งค่าระบบ โดย backend บังคับใช้สถานะก่อนรันโค้ด
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
    client_max_body_size 25m;
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

Repository นี้มี GitHub Actions ที่ `.github/workflows/deploy-plesk.yml` สำหรับ production deployment เมื่อ push เข้า `main` โดย workflow จะรัน unit tests, build ด้วย Node.js 22 และ sync เฉพาะ `dist/` ไปยัง Plesk ผ่าน SSH การ deploy จะเก็บ `.well-known/` และ `.plesk-stat/` ที่มีอยู่บน server ไว้

ค่าที่ workflow ใช้ใน GitHub Actions:

- Secret: `PLESK_SSH_PRIVATE_KEY`
- Variables: `PLESK_HOST`, `PLESK_PORT`, `PLESK_USERNAME`, `PLESK_DOCUMENT_ROOT`, `PLESK_SSH_KNOWN_HOSTS`, `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`

ไฟล์ `public/.htaccess` จะถูกรวมใน `dist/` เพื่อรองรับ React Router และ response headers ที่ Google Sign-In ต้องใช้ ส่วน `/api` ต้องตั้ง reverse proxy ไปยัง backend ใน Plesk แยกต่างหาก

ตรวจเฉพาะการแสดงปุ่ม Google บน dev server โดยไม่เข้าสู่ระบบได้ด้วย `node scripts/check-google-button.mjs` หาก popup ถูกบล็อก ให้ตรวจ COOP/CSP ตาม [ข้อกำหนดของ Google](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#cross_origin_opener_policy)

## ตั้งค่า Subtask

อัปเดต backend ใน `../api-codegrader.online` และรัน `npm run db:deploy`, `npm run db:generate`, `npm run build` ก่อนเปิดใช้งาน frontend รุ่นนี้

1. สร้างโจทย์ฉบับร่างที่ยังไม่มีคำตอบ แล้วเพิ่มกลุ่มใน “Subtasks / กลุ่มทดสอบ” เช่น ข้อมูลเล็ก 20 คะแนน ข้อมูลกลาง 30 คะแนน และข้อมูลใหญ่ 50 คะแนน
2. ระบุเงื่อนไขข้อมูล เช่น `n ≤ 100` แล้วเตรียมไฟล์ `.in` / `.sol` ที่ตรงกับเงื่อนไข เลือก subtask เมื่ออัปโหลด หรือย้ายเทสที่มีอยู่เข้ากลุ่มแล้วกดปุ่มบันทึก
3. เทสในกลุ่มใช้ Time / Memory Limit ของโจทย์ และไม่ให้คะแนนแยก ต้องผ่านทุกเทสจึงได้คะแนนกลุ่ม ตัวอย่างที่ไม่ให้คะแนนเลือกแบบรายเทสและใส่ 0
4. ก่อนเผยแพร่ ทุกกลุ่มต้องมีเทส และคะแนนกลุ่มรวมกับคะแนนเทสที่ไม่อยู่ในกลุ่มต้องเท่ากับคะแนนเต็ม
5. หน้าผลตรวจแสดงคะแนน สถานะ จำนวนเทสที่ผ่าน เวลารวม และหน่วยความจำสูงสุดแยกกลุ่ม คะแนนรวมส่งต่อไปยัง leaderboard ตามน้ำหนักคะแนนโจทย์ในการแข่งขัน

หลังมีคำตอบ ระบบล็อกการจัดกลุ่มและเทสของโจทย์ที่ใช้ subtask เพื่อรักษาผลคะแนนเดิม หากต้องเปลี่ยนเกณฑ์ให้สร้างโจทย์ใหม่ ผลรายกลุ่มถูกบันทึกไว้กับคำตอบ โจทย์เดิมที่ไม่มี subtask ยังใช้คะแนนรายเทสได้เหมือนเดิม Subtask วัดความสามารถในการผ่านชุดข้อมูลที่กำหนด ไม่ได้ยืนยัน Big O ของโค้ด

### นำเข้าเทสหลายชุดด้วย ZIP

ในหน้าแก้ไขโจทย์ เลื่อนมาที่ “เพิ่มหลายเทสด้วย ZIP” เลือก subtask แล้วแนบ ZIP ที่มีคู่ไฟล์ชื่อเดียวกันในโฟลเดอร์เดียวกัน เช่น `01.in` + `01.sol`, `02.in` + `02.sol` รองรับโฟลเดอร์ย่อย จัดลำดับตามชื่อแบบตัวเลข และต่อเลขลำดับจากเทสเดิม ทุกคู่จะเป็นเทสลับที่ใช้คะแนนของกลุ่ม

ZIP ไม่เกิน 20 MB, ไฟล์แต่ละไฟล์หลังแตกไม่เกิน 10 MB, รวมหลังแตกไม่เกิน 50 MB และไม่เกิน 500 เทส ไฟล์ต้องเป็น UTF-8 ไม่ตั้งรหัสผ่าน หากไฟล์ขาดคู่ ชื่อซ้ำ หรือ ZIP เสียหาย จะไม่บันทึกเทสจากชุดนั้นเลย

ฟีเจอร์นี้ต้อง deploy ทั้ง frontend และ API รุ่นที่รองรับ `/api/problems/:id/test-cases/zip` ไม่ต้องเพิ่ม database migration ใหม่ ตั้งขนาด request body ของ reverse proxy/Plesk ให้รองรับ multipart 20 MB เช่น Nginx `client_max_body_size 25m;`

### เลือกหลายเทสเป็นตัวอย่าง

ในตาราง “ชุดทดสอบ / Test cases” ติ๊ก checkbox ของเทสที่ต้องการ หรือเลือกทั้งหมด แล้วกด “ตั้งเป็นตัวอย่าง” เพื่อแสดง Input / Output ในหน้าโจทย์ สามารถเลือกแล้วกด “ตั้งเป็นเทสลับ” เพื่อซ่อนกลับได้ การเปลี่ยนนี้ไม่แก้คะแนน ลำดับ หรือ subtask และใช้ได้กับโจทย์ที่เผยแพร่แล้ว หากบันทึกไม่สำเร็จ ระบบคงรายการที่เลือกไว้ให้ลองใหม่

Subtask results now show group verdicts only. The judge stops each group at its first failed test, continues with the next group, and reports executed/skipped counts. Compilation errors stop the entire submission; problems without subtasks retain individual test results.

## Submission history and score resets

The submissions page groups attempts by problem and opens paginated history (50 attempts per page). Admins use `/admin/submissions` to browse problems, respondents ranked by highest active score, each respondent's history, and individual source code. Score resets apply to one problem or one respondent within that problem, including competition submissions. Reset attempts retain their original verdict and code, display zero points, and no longer contribute to leaderboards. New attempts can earn points normally; in-flight judging cannot remove a reset marker.

Deploy the API and apply its `20261009090000_submission_score_reset` migration before releasing this frontend. SweetAlert2 confirms user-initiated writes, deleting records, replacing draft code, and signing out. Cancelled operations send no request; automatic session expiry still clears the expired session immediately.

## Home, members and privacy

Home displays global total scores: the best active judged score on each published problem, counted once across practice and competitions. Reset attempts and deleted problems are excluded. Blocked/deleted members are hidden; equal scores share a rank. Profile names/photos are shown only after privacy acceptance.

Admins can delete problems/competitions from their management lists and manage members at `/admin/members`. Deletion removes records from active use while retaining submission history and source code. Blocking or deleting a member invalidates access on the next API request, including previously issued tokens. Admin accounts cannot be blocked/deleted through this page.

New and existing members without the current consent version must accept the Thai Privacy/Terms popup before accessing protected pages. Declining signs out. The API enforces the same requirement. IP event history is visible only to admins, covers login/submission/Playground activity, and expires after 90 days. Lifetime counters start when tracking is enabled; grader usage counts runner invocations, including failures, and skips unexecuted tests.

Apply API migration `20261009100000_members_privacy_activity` before releasing this frontend. The API performs hourly expired-log cleanup while running. Configure trusted reverse proxy addresses on the API for accurate client IPs; see the API deployment notes. Constraints accept Enter/newlines and preserve them in problem display.
