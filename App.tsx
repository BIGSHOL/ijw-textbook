import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Download, RotateCcw, Save, History, Settings, PenTool, BookOpen, Search, User, CreditCard, Cog } from 'lucide-react';
import { PreviewCard } from './components/PreviewCard';
import { HistoryList } from './components/HistoryList';
import { Logo } from './components/Logo';
import { InputGroup } from './components/InputGroup';
import { TextbookRequestData, SavedTextbookRequest, INITIAL_DATA } from './types';
import { TextbookManager } from './components/TextbookManager';
import { SettingsPanel } from './components/SettingsPanel';
import { TEXTBOOKS, TextbookDef } from './data/textbooks';
import { BookSelector } from './components/BookSelector';
import {
  getAccountSettings,
  saveAccountSettings,
  AccountSettings,
  uploadImageToStorage,
  saveRequestToFirestore,
  getFilteredRequestsFromFirestore,
  updateRequest,
  deleteRequestFromFirestore,
  getStatusCounts
} from './services/firebase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'textbooks' | 'settings'>('create');
  const [data, setData] = useState<TextbookRequestData>(INITIAL_DATA);
  const [history, setHistory] = useState<SavedTextbookRequest[]>([]);
  const [previewRef, setPreviewRef] = useState<HTMLDivElement | null>(null); // Use state ref callback
  const [accountSettings, setAccountSettings] = useState<AccountSettings>({
    bankName: '',
    accountNumber: '',
    accountHolder: ''
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isBookSelectorOpen, setIsBookSelectorOpen] = useState(false);

  // Custom Textbooks State (Local Storage for now, could be Firestore too)
  const [textbooks, setTextbooks] = useState<TextbookDef[]>(() => {
    const saved = localStorage.getItem('customTextbooks');
    return saved ? JSON.parse(saved) : TEXTBOOKS;
  });

  // Admin Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // History Tab State
  const [historyTab, setHistoryTab] = useState<'incomplete' | 'complete'>('incomplete');

  // Firestore Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [incompleteTotalCount, setIncompleteTotalCount] = useState(0);
  const [completeTotalCount, setCompleteTotalCount] = useState(0);

  // Load account settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      const settings = await getAccountSettings();
      setAccountSettings(settings); // Just set state, don't auto-fill form yet unless reset

      // Initial fill if form is empty
      if (!data.bankName && !data.accountNumber) {
        setData(prev => ({
          ...prev,
          bankName: settings.bankName,
          accountNumber: settings.accountNumber,
          accountHolder: settings.accountHolder
        }));
      }
      setIsLoadingSettings(false);
    };
    loadSettings();
  }, []);

  // Fetch History from Firestore
  const fetchHistory = async (tab: 'incomplete' | 'complete' = historyTab, page: number = 1) => {
    if (isLoadingHistory) return;
    setIsLoadingHistory(true);
    try {
      const result = await getFilteredRequestsFromFirestore(tab, page, 20);
      setHistory(result.requests);
      setCurrentPage(result.currentPage);
      setTotalPages(result.totalPages);

      // Also fetch counts for both tabs
      const incompleteResult = await getFilteredRequestsFromFirestore('incomplete', 1, 1);
      const completeResult = await getFilteredRequestsFromFirestore('complete', 1, 1);
      setIncompleteTotalCount(incompleteResult.totalCount);
      setCompleteTotalCount(completeResult.totalCount);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      alert("기록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Handle history tab change
  const handleHistoryTabChange = (tab: 'incomplete' | 'complete') => {
    setHistoryTab(tab);
    setCurrentPage(1);
    fetchHistory(tab, 1);
  };

  // Initial History Load
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(historyTab, 1);
    }
  }, [activeTab]);

  // Admin Shortcut Listener
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Shortcut: Ctrl + Alt + K
      if (e.ctrlKey && e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const password = prompt("관리자 암호를 입력하세요:");
        if (password === "5099") {
          setIsAdminAuthenticated(true);
          // Fetch status counts
          const counts = await getStatusCounts();
          alert(`관리자 모드로 전환되었습니다.\n\n[미처리 현황]\n• 등록 미완료: ${counts.registered}건\n• 납부 미완료: ${counts.paid}건\n• 주문 미완료: ${counts.ordered}건`);
        } else if (password !== null) {
          alert("암호가 올바르지 않습니다.");
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save textbooks to local storage whenever changed
  useEffect(() => {
    localStorage.setItem('customTextbooks', JSON.stringify(textbooks));
  }, [textbooks]);

  // Save account settings handler (Firebase)
  const handleSaveAccountSettings = async (settings: AccountSettings): Promise<boolean> => {
    const success = await saveAccountSettings(settings);
    if (success) {
      setAccountSettings(settings);
      // Also update current form data if fields are empty
      setData(prev => ({
        ...prev,
        bankName: prev.bankName || settings.bankName,
        accountNumber: prev.accountNumber || settings.accountNumber,
        accountHolder: prev.accountHolder || settings.accountHolder,
      }));
    }
    return success;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleBookSelect = (book: TextbookDef) => {
    let name = book.name;
    let detail = '';

    // " 01." pattern (space + 2 digits + dot)
    const splitMatch = name.match(/\s(\d{2}\..*)/);

    if (splitMatch) {
      // splitMatch[0] is " 01. ...", splitMatch[1] is "01. ..."
      const matchIndex = splitMatch.index;
      if (typeof matchIndex === 'number') {
        name = book.name.substring(0, matchIndex);
        detail = splitMatch[1]; // The captured group "01. ..."
      }
    }

    setData(prev => ({
      ...prev,
      bookName: name,
      bookDetail: detail,
      price: book.price
    }));
    setIsBookSelectorOpen(false);
  };

  const handleReset = () => {
    if (window.confirm("입력한 내용을 모두 초기화하시겠습니까?")) {
      setData({
        ...INITIAL_DATA,
        bankName: accountSettings.bankName,
        accountNumber: accountSettings.accountNumber,
        accountHolder: accountSettings.accountHolder,
      });
    }
  };

  const handleSaveAndDownload = useCallback(async () => {
    if (!previewRef) { // Changed to check state ref
      return;
    }

    if (!data.studentName || !data.bookName) {
      alert("학생 이름과 교재명은 필수입니다.");
      return;
    }

    // 1. Generate Image Data URL
    let dataUrl = '';
    try {
      dataUrl = await toPng(previewRef, { cacheBust: true, pixelRatio: 2 });
    } catch (err) {
      console.error('Failed to generate image', err);
      alert('이미지 생성에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    // 2. Trigger Download (Local) - User wants feedback immediately
    const link = document.createElement('a');
    const fileName = `${data.requestDate}_${data.studentName}_${data.bookName}.png`;
    link.download = fileName;
    link.href = dataUrl;
    link.click();

    // 3. Save to Firestore (Data Only, No Image Upload)
    try {
      // Custom ID Format: Teacher_Student_BookName_YYYYMMDDHHmmss
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 17); // YYYYMMDDHHmmssSSS (밀리초 포함)
      const sanitizedBookName = data.bookName.replace(/[^a-zA-Z0-9가-힣]/g, ''); // 특수문자 제거
      const customId = `${data.teacherName}_${data.studentName}_${sanitizedBookName}_${timestamp}`;

      const newRecord: SavedTextbookRequest = {
        ...data,
        id: customId,
        createdAt: now.toISOString(),
        isCompleted: false, // Default to not completed
        // imageUrl is omitted as we are not uploading
      };

      await saveRequestToFirestore(newRecord);

      // Update local history state (prepend)
      setHistory(prev => [newRecord, ...prev]);
      alert("이미지가 다운로드되고 요청 내역이 서버에 저장되었습니다.");
      setActiveTab('history'); // Switch to history tab

    } catch (err) {
      console.error('Failed to save to server', err);
      alert('서버 저장에 실패했습니다. (이미지는 다운로드되었습니다)');
    }
  }, [data, previewRef]);

  const handleLoadHistory = (item: SavedTextbookRequest) => {
    // Remove ID and CreatedAt before setting data
    const { id, createdAt, isCompleted, imageUrl, ...requestData } = item;
    setData(requestData);
    setActiveTab('create');
  };

  const handleDeleteHistory = async (id: string) => {
    if (window.confirm("정말 이 기록을 삭제하시겠습니까?")) {
      try {
        await deleteRequestFromFirestore(id);
        setHistory(prev => prev.filter(item => item.id !== id));
      } catch (err) {
        alert("삭제에 실패했습니다.");
      }
    }
  };

  const handleCompleteHistory = async (ids: string[], isCompleted: boolean) => {
    try {
      // Optimistic update
      setHistory(prev => prev.map(item =>
        ids.includes(item.id) ? { ...item, isCompleted } : item
      ));

      // Parallel updates
      await Promise.all(ids.map(id => updateRequest(id, { isCompleted })));

      alert(`${ids.length}개의 항목이 ${isCompleted ? '등록 완료' : '등록 취소'}되었습니다.`);
    } catch (err) {
      console.error("Failed to update status", err);
      alert("상태 업데이트 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
      // Rollback could be implemented here
    }
  };

  const handleUpdateRequest = async (id: string, updates: Partial<SavedTextbookRequest>) => {
    try {
      // Add timestamps for status changes
      const now = new Date().toISOString();
      const updatesWithTimestamps: Record<string, any> = { ...updates };

      if (updates.isCompleted === true) {
        updatesWithTimestamps.completedAt = now;
      } else if (updates.isCompleted === false) {
        updatesWithTimestamps.completedAt = null;  // Use null for Firestore
      }

      if (updates.isPaid === true) {
        updatesWithTimestamps.paidAt = now;
      } else if (updates.isPaid === false) {
        updatesWithTimestamps.paidAt = null;  // Use null for Firestore
      }

      if (updates.isOrdered === true) {
        updatesWithTimestamps.orderedAt = now;
      } else if (updates.isOrdered === false) {
        updatesWithTimestamps.orderedAt = null;  // Use null for Firestore
      }

      // Optimistic update
      setHistory(prev => prev.map(item =>
        item.id === id ? { ...item, ...updatesWithTimestamps } : item
      ));

      await updateRequest(id, updatesWithTimestamps);
    } catch (err) {
      console.error("Failed to update request", err);
      alert("업데이트에 실패했습니다.");
    }
  };

  // Callback ref to handle div mount/unmount
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setPreviewRef(node);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">

      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-brand-green w-6 h-6" />
            <h1 className="text-xl font-bold text-gray-800">인재원 교재 요청서</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Tab Navigation */}
            <div className="bg-gray-100 p-1 rounded-lg flex gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'create'
                  ? 'bg-white text-brand-green shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <PenTool className="w-4 h-4" /> 작성하기
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'history'
                  ? 'bg-white text-brand-green shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <History className="w-4 h-4" /> 기록
              </button>
              {isAdminAuthenticated && (
                <>
                  <button
                    onClick={() => setActiveTab('textbooks')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'textbooks'
                      ? 'bg-white text-brand-green shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <Settings className="w-4 h-4" /> 교재 관리
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings'
                      ? 'bg-white text-brand-green shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <Cog className="w-4 h-4" /> 설정
                  </button>
                </>
              )}
            </div>

            {activeTab === 'create' && (
              <button
                onClick={handleReset}
                className="text-gray-500 hover:text-red-500 text-sm flex items-center gap-1 transition-colors ml-2 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" /> 초기화
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">

        {activeTab === 'create' && (
          <>
            {/* Left Side: Input Form */}
            <div className="w-full lg:w-1/3 xl:w-1/4 bg-white border-r border-gray-200 overflow-y-auto p-6 shadow-lg z-10">
              <div className="space-y-8 pb-20">

                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-brand-green font-semibold border-b pb-2">
                    <User className="w-5 h-5" />
                    <h2>기본 정보</h2>
                  </div>
                  <InputGroup label="학생 이름" name="studentName" value={data.studentName} onChange={handleChange} placeholder="학생 이름을 입력하세요" />
                  <InputGroup label="담임 선생님" name="teacherName" value={data.teacherName} onChange={handleChange} placeholder="선생님 성함을 입력하세요" />
                  <InputGroup label="요청 일자" name="requestDate" type="date" value={data.requestDate} onChange={handleChange} />
                </div>

                {/* Section 2: Book Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-brand-green font-semibold border-b pb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      <h2>교재 내용</h2>
                    </div>
                    <button
                      onClick={() => setIsBookSelectorOpen(true)}
                      className="text-xs bg-brand-green text-white px-2 py-1 rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                    >
                      <Search className="w-3 h-3" /> 교재 검색
                    </button>
                  </div>

                  <div className="relative">
                    <InputGroup label="교재명(과목/난이도)" name="bookName" value={data.bookName} onChange={handleChange} placeholder="교재명을 입력하세요" />
                    <InputGroup label="상세 내용(단원)" name="bookDetail" value={data.bookDetail || ''} onChange={handleChange} placeholder="교재 상세 내용을 입력하세요 (선택 사항)" className="mt-2" />
                  </div>
                  <InputGroup label="금액 (원)" name="price" type="number" value={data.price} onChange={handleChange} placeholder="금액을 입력하세요" />
                </div>

                {/* Section 3: Account Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-brand-green font-semibold border-b pb-2">
                    <CreditCard className="w-5 h-5" />
                    <h2>계좌 정보</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <InputGroup className="col-span-1" label="은행명" name="bankName" value={data.bankName} onChange={handleChange} />
                    <InputGroup className="col-span-2" label="예금주" name="accountHolder" value={data.accountHolder} onChange={handleChange} />
                  </div>
                  <InputGroup label="계좌번호" name="accountNumber" value={data.accountNumber} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Right Side: Preview & Actions */}
            <div className="flex-1 bg-gray-100/50 p-6 lg:p-10 flex flex-col items-center overflow-y-auto">

              <div className="w-full max-w-2xl flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-600">미리보기</h2>
                <button
                  onClick={handleSaveAndDownload}
                  className="bg-gray-900 text-white px-6 py-2 rounded-full shadow-md hover:bg-black transition-colors flex items-center gap-2 font-medium"
                >
                  <Download className="w-4 h-4" /> 이미지 저장 및 기록
                </button>
              </div>

              <div className="shadow-2xl rounded-sm overflow-hidden scale-95 lg:scale-100 transition-transform origin-top">
                <PreviewCard ref={measuredRef} data={data} />
              </div>

              <p className="text-gray-400 text-sm mt-8 pb-10">
                * '이미지 저장 및 기록' 버튼을 누르면 갤러리에 저장되고 목록 탭에 기록됩니다.<br />
                * 입력한 내용은 자동으로 미리보기에 반영됩니다.
              </p>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 bg-gray-50 overflow-y-auto flex flex-col items-center">
            <HistoryList
              history={history}
              onLoad={handleLoadHistory}
              onDelete={handleDeleteHistory}
              isAdmin={isAdminAuthenticated}
              onUpdate={handleUpdateRequest}
              activeHistoryTab={historyTab}
              onTabChange={handleHistoryTabChange}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page: number) => fetchHistory(historyTab, page)}
              isLoading={isLoadingHistory}
              incompleteTotalCount={incompleteTotalCount}
              completeTotalCount={completeTotalCount}
            />
          </div>
        )}

        {activeTab === 'textbooks' && (
          <div className="flex-1 bg-gray-50 overflow-y-auto">
            <TextbookManager
              books={textbooks}
              onUpdateBooks={setTextbooks}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 bg-gray-50 overflow-y-auto">
            <SettingsPanel
              accountSettings={accountSettings}
              onSaveAccountSettings={handleSaveAccountSettings}
              isLoading={isLoadingSettings}
            />
          </div>
        )}

        <BookSelector
          isOpen={isBookSelectorOpen}
          onClose={() => setIsBookSelectorOpen(false)}
          onSelect={handleBookSelect}
          books={textbooks}
        />

      </main>
    </div>
  );
};

export default App;
