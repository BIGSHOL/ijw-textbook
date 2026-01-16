import React, { useState, useMemo } from 'react';
import { Search, X, Book } from 'lucide-react';
import { TextbookDef } from '../data/textbooks';

interface BookSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (book: TextbookDef) => void;
  books: TextbookDef[]; // Now accepts books from parent
}

export const BookSelector: React.FC<BookSelectorProps> = ({ isOpen, onClose, onSelect, books }) => {
  const [activeTab, setActiveTab] = useState<'elementary' | 'middle' | 'high'>('elementary');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesTab = book.category === activeTab;
      const matchesSearch = book.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            book.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            book.difficulty.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery, books]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <Book className="text-brand-green w-5 h-5" />
            <h2 className="text-lg font-bold text-gray-800">교재 선택</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="p-4 space-y-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('elementary')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'elementary' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              초등 과정
            </button>
            <button 
              onClick={() => setActiveTab('middle')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'middle' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              중등 과정
            </button>
            <button 
              onClick={() => setActiveTab('high')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'high' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              고등 과정
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="교재명, 학년 또는 난이도로 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredBooks.length > 0 ? (
            <div className="grid divide-y divide-gray-100">
              {filteredBooks.map((book) => (
                <button
                  key={`${book.category}-${book.grade}-${book.name}`}
                  onClick={() => onSelect(book)}
                  className="flex items-center justify-between p-4 hover:bg-green-50 transition-colors text-left group w-full"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {book.grade}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                        {book.difficulty}
                      </span>
                    </div>
                    <div className="text-gray-900 font-medium group-hover:text-brand-green transition-colors">
                      {book.name}
                    </div>
                  </div>
                  <div className="text-right font-bold text-gray-800 whitespace-nowrap ml-4">
                    {book.price.toLocaleString()}원
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Search className="w-12 h-12 mb-2 opacity-20" />
              <p>검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};