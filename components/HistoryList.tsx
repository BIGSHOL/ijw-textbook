import React, { useState, useRef, useEffect } from 'react';
import { SavedTextbookRequest } from '../types';
import { Trash2, RotateCcw, FileText, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { PreviewCard } from './PreviewCard';

// Date formatting helpers
const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatShortDate = (isoString: string) => {
  const date = new Date(isoString);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

interface HistoryListProps {
  history: SavedTextbookRequest[];
  onLoad: (data: SavedTextbookRequest) => void;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
  onUpdate?: (id: string, updates: Partial<SavedTextbookRequest>) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onLoad, onDelete, isAdmin, onUpdate }) => {
  const [downloadingItem, setDownloadingItem] = useState<SavedTextbookRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (downloadingItem && previewRef.current) {
      const currentItem = downloadingItem;
      const timer = setTimeout(async () => {
        try {
          const dataUrl = await toPng(previewRef.current!, { cacheBust: true, pixelRatio: 2 });
          const link = document.createElement('a');
          link.download = `${currentItem.requestDate}_${currentItem.studentName}_${currentItem.bookName}.png`;
          link.href = dataUrl;
          link.click();
        } catch (err) {
          console.error('Download failed', err);
          alert('이미지 다운로드에 실패했습니다.');
        } finally {
          setDownloadingItem(null);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [downloadingItem]);

  // Check if all 3 statuses are checked
  const isFullyCompleted = (item: SavedTextbookRequest) => {
    return !!item.isOrdered && !!item.isCompleted && !!item.isPaid;
  };

  const filteredHistory = history
    .filter((item) => {
      const term = searchTerm.toLowerCase();
      return (
        item.studentName.toLowerCase().includes(term) ||
        item.bookName.toLowerCase().includes(term) ||
        item.teacherName.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      // 1. Fully Completed Status (Incomplete first)
      const aComplete = isFullyCompleted(a);
      const bComplete = isFullyCompleted(b);
      if (aComplete !== bComplete) {
        return aComplete ? 1 : -1;
      }
      // 2. Date (Newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-10">
        <FileText className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg">저장된 요청 내역이 없습니다.</p>
        <p className="text-sm">교재 요청서를 작성하고 저장하면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-fadeIn relative">
      <div className="mb-6 flex justify-end items-center">
        <input
          type="text"
          placeholder="이름, 교재명, 선생님 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-yellow focus:border-transparent outline-none w-64"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="p-4 font-medium whitespace-nowrap text-center">요청일자</th>
                <th className="p-4 font-medium whitespace-nowrap text-center">학생 이름</th>
                <th className="p-4 font-medium text-center">교재명</th>
                <th className="p-4 font-medium whitespace-nowrap text-center">금액</th>
                <th className="p-4 font-medium text-center whitespace-nowrap">상태</th>
                <th className="p-4 font-medium whitespace-nowrap text-center">선생님</th>
                <th className="p-4 font-medium text-center whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => {
                  const fullyComplete = isFullyCompleted(item);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors border-b last:border-b-0 ${fullyComplete
                        ? 'bg-gray-100 text-gray-400 hover:bg-gray-200/70'
                        : 'hover:bg-gray-50/50 text-gray-900'
                        }`}
                    >
                      <td className="p-4 text-sm whitespace-nowrap">
                        {item.requestDate}
                      </td>
                      <td className="p-4 font-medium whitespace-nowrap">
                        {item.studentName}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className={fullyComplete ? 'line-through decoration-gray-400' : ''}>
                            {item.bookName}
                          </span>
                          {item.bookDetail && (
                            <span className={`text-xs mt-0.5 ${fullyComplete ? 'text-gray-400' : 'text-gray-500'}`}>
                              {item.bookDetail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`p-4 text-right font-medium whitespace-nowrap ${fullyComplete ? '' : 'text-brand-green'}`}>
                        {item.price.toLocaleString()}원
                      </td>

                      {/* Status Column - Visible to all, editable by admin only */}
                      <td className="p-4">
                        <div className="flex items-start justify-center gap-3">
                          {/* Registered Checkbox - 등록 */}
                          <label
                            className={`flex flex-col items-center gap-0.5 select-none group h-10 ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                            title={item.completedAt ? `등록: ${formatDate(item.completedAt)}` : '등록 대기'}
                          >
                            <div className="flex items-center gap-1">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${item.isCompleted ? 'bg-brand-green border-brand-green' : 'bg-white border-gray-300'} ${isAdmin && !item.isCompleted ? 'group-hover:border-brand-green' : ''}`}>
                                {item.isCompleted && <div className="w-2 h-2 bg-white rounded-sm" />}
                              </div>
                              {isAdmin && (
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={!!item.isCompleted}
                                  onChange={(e) => onUpdate?.(item.id, { isCompleted: e.target.checked })}
                                />
                              )}
                              <span className={`text-xs font-medium ${item.isCompleted ? 'text-brand-green' : 'text-gray-500'}`}>등록</span>
                            </div>
                            <span className="text-[10px] text-gray-400 h-3">{item.completedAt ? formatShortDate(item.completedAt) : ''}</span>
                          </label>

                          {/* Paid Checkbox - 납부 */}
                          <label
                            className={`flex flex-col items-center gap-0.5 select-none group h-10 ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                            title={item.paidAt ? `납부: ${formatDate(item.paidAt)}` : '납부 대기'}
                          >
                            <div className="flex items-center gap-1">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${item.isPaid ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'} ${isAdmin && !item.isPaid ? 'group-hover:border-blue-400' : ''}`}>
                                {item.isPaid && <div className="w-2 h-2 bg-white rounded-sm" />}
                              </div>
                              {isAdmin && (
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={!!item.isPaid}
                                  onChange={(e) => onUpdate?.(item.id, { isPaid: e.target.checked })}
                                />
                              )}
                              <span className={`text-xs font-medium ${item.isPaid ? 'text-blue-600' : 'text-gray-500'}`}>납부</span>
                            </div>
                            <span className="text-[10px] text-gray-400 h-3">{item.paidAt ? formatShortDate(item.paidAt) : ''}</span>
                          </label>

                          {/* Order Checkbox - 주문 */}
                          <label
                            className={`flex flex-col items-center gap-0.5 select-none group h-10 ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                            title={item.orderedAt ? `주문: ${formatDate(item.orderedAt)}` : '주문 대기'}
                          >
                            <div className="flex items-center gap-1">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${item.isOrdered ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'} ${isAdmin && !item.isOrdered ? 'group-hover:border-orange-400' : ''}`}>
                                {item.isOrdered && <div className="w-2 h-2 bg-white rounded-sm" />}
                              </div>
                              {isAdmin && (
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={!!item.isOrdered}
                                  onChange={(e) => onUpdate?.(item.id, { isOrdered: e.target.checked })}
                                />
                              )}
                              <span className={`text-xs font-medium ${item.isOrdered ? 'text-orange-600' : 'text-gray-500'}`}>주문</span>
                            </div>
                            <span className="text-[10px] text-gray-400 h-3">{item.orderedAt ? formatShortDate(item.orderedAt) : ''}</span>
                          </label>
                        </div>
                      </td>

                      <td className="p-4 text-sm whitespace-nowrap">
                        {item.teacherName}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setDownloadingItem(item)}
                            className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium whitespace-nowrap ${fullyComplete
                              ? 'text-gray-400 hover:bg-gray-200'
                              : 'text-indigo-500 hover:bg-indigo-50'
                              }`}
                            title="이미지 다운로드"
                            disabled={downloadingItem !== null}
                          >
                            <Download className="w-4 h-4" />
                            {downloadingItem?.id === item.id ? '...' : '다운로드'}
                          </button>
                          {(!fullyComplete || isAdmin) && (
                            <button
                              onClick={() => onLoad(item)}
                              className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium whitespace-nowrap ${fullyComplete
                                ? 'text-gray-400 hover:bg-gray-200'
                                : 'text-blue-500 hover:bg-blue-50'
                                }`}
                              title="이 내용 불러오기"
                            >
                              <RotateCcw className="w-4 h-4" /> 불러오기
                            </button>
                          )}
                          {(!fullyComplete || isAdmin) && (
                            <button
                              onClick={() => onDelete(item.id)}
                              className={`p-2 rounded-lg transition-colors ${fullyComplete
                                ? 'text-gray-400 hover:bg-gray-200'
                                : 'text-red-500 hover:bg-red-50'
                                }`}
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div >
      </div >

      {/* Hidden Preview Card for Generation */}
      {
        downloadingItem && (
          <div style={{ position: 'absolute', top: -9999, left: -9999 }}>
            <div ref={previewRef}>
              <PreviewCard data={downloadingItem} />
            </div>
          </div>
        )
      }
    </div >
  );
};