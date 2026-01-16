import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, X, Save, Book } from 'lucide-react';
import { TextbookDef } from '../data/textbooks';

interface TextbookManagerProps {
  books: TextbookDef[];
  onUpdateBooks: (newBooks: TextbookDef[]) => void;
}

export const TextbookManager: React.FC<TextbookManagerProps> = ({ books, onUpdateBooks }) => {
  const [activeTab, setActiveTab] = useState<'elementary' | 'middle' | 'high'>('elementary');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // Index in the global 'books' array
  const [formData, setFormData] = useState<TextbookDef>({
    category: 'elementary',
    grade: '',
    difficulty: '',
    name: '',
    price: 0
  });

  const filteredBooks = useMemo(() => {
    // We map to preserve original index for editing
    return books
      .map((book, index) => ({ ...book, originalIndex: index }))
      .filter(book => {
        const matchesTab = book.category === activeTab;
        const matchesSearch = book.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              book.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              book.difficulty.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
      });
  }, [activeTab, searchQuery, books]);

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFormData({
      category: activeTab,
      grade: '',
      difficulty: '',
      name: '',
      price: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (originalIndex: number) => {
    setEditingIndex(originalIndex);
    setFormData({ ...books[originalIndex] });
    setIsModalOpen(true);
  };

  const handleDelete = (originalIndex: number) => {
    if (window.confirm(`'${books[originalIndex].name}' 교재를 삭제하시겠습니까?`)) {
      const newBooks = [...books];
      newBooks.splice(originalIndex, 1);
      onUpdateBooks(newBooks);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.price) {
      alert("교재명과 가격은 필수입니다.");
      return;
    }

    const newBooks = [...books];
    if (editingIndex !== null) {
      // Edit existing
      newBooks[editingIndex] = formData;
    } else {
      // Add new
      newBooks.push(formData);
    }
    onUpdateBooks(newBooks);
    setIsModalOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value
    }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 animate-fadeIn h-full flex flex-col">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col flex-1 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50">
           <div className="flex bg-gray-200 rounded-lg p-1 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('elementary')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'elementary' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              초등 과정
            </button>
            <button 
              onClick={() => setActiveTab('middle')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'middle' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              중등 과정
            </button>
            <button 
              onClick={() => setActiveTab('high')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'high' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              고등 과정
            </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green/50 outline-none"
              />
            </div>
            <button 
              onClick={handleOpenAdd}
              className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> 교재 추가
            </button>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 p-4 bg-gray-100 text-xs font-semibold text-gray-500 border-b border-gray-200 uppercase tracking-wider">
          <div className="col-span-2 text-center">학년</div>
          <div className="col-span-2 text-center">난이도</div>
          <div className="col-span-5">교재명</div>
          <div className="col-span-2 text-right">판매가</div>
          <div className="col-span-1 text-center">관리</div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 bg-white">
          {filteredBooks.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredBooks.map((book) => (
                <div key={book.originalIndex} className="grid grid-cols-12 gap-2 p-4 hover:bg-gray-50 transition-colors items-center text-sm">
                  <div className="col-span-2 text-center">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{book.grade}</span>
                  </div>
                  <div className="col-span-2 text-center text-gray-600">
                    {book.difficulty}
                  </div>
                  <div className="col-span-5 font-medium text-gray-900 truncate" title={book.name}>
                    {book.name}
                  </div>
                  <div className="col-span-2 text-right font-bold text-gray-800">
                     {book.price.toLocaleString()}원
                  </div>
                  <div className="col-span-1 flex justify-center gap-1">
                    <button 
                      onClick={() => handleOpenEdit(book.originalIndex)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(book.originalIndex)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Book className="w-12 h-12 mb-2 opacity-20" />
              <p>등록된 교재가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                {editingIndex !== null ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingIndex !== null ? '교재 수정' : '새 교재 추가'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">과정 (Category)</label>
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 outline-none"
                >
                  <option value="elementary">초등 과정</option>
                  <option value="middle">중등 과정</option>
                  <option value="high">고등 과정</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                  <input 
                    type="text" 
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    placeholder="예: 초5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
                  <input 
                    type="text" 
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    placeholder="예: 기본"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">교재명</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="예: 초5-1 기본 1권"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">판매가 (원)</label>
                <input 
                  type="number" 
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                <Save className="w-4 h-4" /> 저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};