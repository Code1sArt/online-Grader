import Swal from 'sweetalert2';

export async function confirmAction(text: string, title = 'ยืนยันการดำเนินการ') {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#176b50',
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}
export class ActionCancelled extends Error {
  constructor() {
    super('');
  }
}
