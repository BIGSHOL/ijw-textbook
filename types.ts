export interface TextbookRequestData {
  studentName: string;
  teacherName: string;
  requestDate: string;
  bookName: string;
  bookDetail?: string; // 상세 내용 (단원 등)
  price: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface SavedTextbookRequest extends TextbookRequestData {
  id: string;
  createdAt: string;
  isCompleted?: boolean;
  completedAt?: string;
  isPaid?: boolean;
  paidAt?: string;
  isOrdered?: boolean;
  orderedAt?: string;
  imageUrl?: string; // Firebase Storage URL
}

export const INITIAL_DATA: TextbookRequestData = {
  studentName: '',
  teacherName: '',
  requestDate: new Date().toISOString().split('T')[0],
  bookName: '',
  bookDetail: '',
  price: 0,
  bankName: '',
  accountNumber: '',
  accountHolder: '',
};