document.addEventListener('DOMContentLoaded', () => {
  // --- existing code ---
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const profileBox = $('#profileBox');
  const profileName = $('#profileName');
  const profileAvatar = $('#profileAvatar');
  const profileMeta = $('#profileMeta');

  // --- your existing elements ---
  const titleEl = $('#title');
  const noteEl = $('#note');
  const titleCount = $('#titleCount');
  const noteCount = $('#noteCount');
  const alertBox = $('#alertBox');
  const yearNowEl = $('#yearNow');
  const submitBtn = $('#submitBtn');
  const submitSpinner = $('#submitSpinner');
  const letterForm = $('#letterForm');

  // --- counters ---
  const updateCounter = (input, counterEl) => {
    if (counterEl) counterEl.textContent = String(input.value.length);
  };
  ['input', 'change'].forEach(evt => {
    if (titleEl && titleCount) titleEl.addEventListener(evt, () => updateCounter(titleEl, titleCount));
    if (noteEl && noteCount) noteEl.addEventListener(evt, () => updateCounter(noteEl, noteCount));
  });

  // --- footer year ---
  if (yearNowEl) yearNowEl.textContent = new Date().getFullYear();

  // --- LIFF Init ---
  async function initLIFF() {
    console.log("start")
    try {
      await liff.init({ liffId: "1657704109-dZayMMoA" }); // เปลี่ยนเป็น LIFF ID ของคุณ

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        console.log(profile)
        // if (profileName) profileName.textContent = profile.displayName;
        if (profileName) profileName.textContent = liff.getDecodedIDToken().email || profile?.displayName;
        if (profileAvatar) profileAvatar.src = profile.pictureUrl || profileAvatar.src;
        if (profileMeta) profileMeta.textContent = 'เชื่อมต่อ LIFF แล้ว';
      } else {
        // ถ้ายังไม่ได้ login
        if (profileMeta) profileMeta.textContent = 'ยังไม่เชื่อมต่อ LIFF';
        liff.login(); // จะ redirect login
      }
    } catch (err) {
      console.error('LIFF init error:', err);
      if (profileMeta) profileMeta.textContent = 'LIFF ไม่พร้อมใช้งาน';
    }
  }


  // --- call LIFF init ---
  initLIFF();

  // --- validation, showErrors, toast, submitForm ---
  function validate(formData) {
    const errors = {};
    const docType = formData.documentType?.trim();
    const year = Number(formData.year);
    const title = formData.title?.trim() || '';
    const issuedBy = formData.issuedBy?.trim() || '';
    const recipient = formData.recipient?.trim() || '';
    const priority = formData.priority?.trim() || 'NORMAL';
    const note = formData.note?.trim() || '';

    if (!docType) errors.documentType = 'โปรดเลือกประเภทเอกสาร';
    else if (!['ORDER','OUTLETTER','NOTE','CERTIFICATE'].includes(docType)) {
      errors.documentType = 'ประเภทเอกสารไม่ถูกต้อง';
    }

    if (!formData.year) errors.year = 'กรอกปี พ.ศ.';
    else if (!Number.isInteger(year)) errors.year = 'ปีต้องเป็นจำนวนเต็ม';
    else if (year < 2568) errors.year = 'ปีต้องตั้งแต่ 2568 ขึ้นไป';

    if (!title) errors.title = 'กรอกเรื่องของหนังสือ';
    else if (title.length < 5) errors.title = 'เรื่องต้องมีอย่างน้อย 5 อักขระ';
    else if (title.length > 500) errors.title = 'เรื่องต้องไม่เกิน 500 อักขระ';

    if (!issuedBy) errors.issuedBy = 'กรอกชื่อผู้ออกเลขที่';
    else if (issuedBy.length > 255) errors.issuedBy = 'ความยาวเกิน 255 อักขระ';

    if (!recipient) errors.recipient = 'กรอกชื่อผู้รับเอกสาร';
    else if (recipient.length > 255) errors.recipient = 'ความยาวเกิน 255 อักขระ';

    if (priority && !['NORMAL','URGENT','VERY_URGENT','MOST_URGENT'].includes(priority)) {
      errors.priority = 'ค่าชั้นความเร็วไม่ถูกต้อง';
    }

    if (note && note.length > 500) errors.note = 'หมายเหตุต้องไม่เกิน 500 อักขระ';

    return errors;
  }

  function showErrors(errors) {
    $$('[data-error-for]').forEach(el => el.textContent = '');
    Object.entries(errors).forEach(([field, message]) => {
      const holder = document.querySelector(`[data-error-for="${field}"]`);
      if (holder) holder.textContent = message;
    });
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const fieldEl = document.getElementById(firstKey);
      if (fieldEl) fieldEl.focus();
    }
  }

  function toast({ type = 'success', title = '', message = '' }) {
    if (!alertBox) return;
    const color = type === 'success' ? 'emerald' : type === 'warn' ? 'amber' : 'rose';
    alertBox.className = `rounded-xl p-3 border text-sm bg-${color}-50 border-${color}-200 text-${color}-700`;
    alertBox.innerHTML = `<div class="font-medium">${title}</div><div>${message}</div>`;
    alertBox.classList.remove('hidden');
    setTimeout(() => alertBox.classList.add('hidden'), 3000);
  }

async function submitForm(evt) {
  evt.preventDefault();
  if (!letterForm) return;

  const payload = {
    documentType: letterForm.documentType.value,
    year: letterForm.year.value,
    title: letterForm.title.value,
    issuedBy: letterForm.issuedBy.value,
    recipient: letterForm.recipient.value,
    priority: letterForm.priority.value || 'NORMAL',
    note: letterForm.note.value || null,
  };

  const errors = validate(payload);
  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    toast({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'โปรดตรวจสอบช่องที่มีข้อความแจ้งเตือน' });
    return;
  }

  showErrors({});
  submitBtn.disabled = true;
  if (submitSpinner) submitSpinner.classList.remove('hidden');

  try {
    // 1. บันทึกข้อมูลลง DB
    const res = await fetch('https://line-esmodule-new.vercel.app/document/letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.message || data?.error || 'ไม่สามารถบันทึกได้';
      throw new Error(msg);
    }

    const newLetter = await res.json();

    toast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'ระบบได้ออกเลขหนังสือแล้ว' });

    // 2. ส่ง Flex Message ผ่าน LIFF
      const flexMessage = {
        type: "flex",
        altText: "รายละเอียดหนังสือใหม่",
        contents: {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "📄 หนังสือใหม่", weight: "bold", size: "lg", color: "#0000FF" }
            ]
          },
          body: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              { type: "text", text: `เลขที่: ${newLetter.fullNumber}`, weight: "bold" },
              { type: "text", text: `เรื่อง: ${newLetter.title}` },
              { type: "text", text: `ออกโดย: ${newLetter.issuedBy}` },
              { type: "text", text: `ผู้รับ: ${newLetter.recipient}` },
              { type: "text", text: `ชั้นความเร็ว: ${newLetter.priority}` },
              { type: "text", text: `หมายเหตุ: ${newLetter.note || '-'}` }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: `ปี พ.ศ.: ${newLetter.year}`, size: "sm", color: "#aaaaaa" }
            ]
          }
        }
      };
    if (liff.isInClient()) {
      await liff.sendMessages([flexMessage]);
    }

    // 3. Reset form แต่เก็บ docType/year
    const keep = { documentType: payload.documentType, year: payload.year };
    letterForm.reset();
    letterForm.documentType.value = keep.documentType;
    letterForm.year.value = keep.year;
    updateCounter(titleEl, titleCount);
    updateCounter(noteEl, noteCount);

  } catch (err) {
    toast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message || 'โปรดลองใหม่อีกครั้ง' });
  } finally {
    submitBtn.disabled = false;
    if (submitSpinner) submitSpinner.classList.add('hidden');
  }
}


  if (letterForm) letterForm.addEventListener('submit', submitForm);

  // Enter key UX
  $$('select, input, textarea').forEach((el, idx, arr) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && el.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const next = arr[idx + 1]; 
        if (next) next.focus();
      }
    });
  });
});
