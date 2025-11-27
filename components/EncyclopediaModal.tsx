
import React, { useState } from 'react';
import { X, Search, Book, Mountain, Sprout, History, Database, ChevronRight, Hash } from 'lucide-react';
import { EncyclopediaEntry, EncyclopediaCategory } from '../types';

interface EncyclopediaModalProps {
  onClose: () => void;
  completedPuzzleIds: string[];
}

// Static Data for the Encyclopedia
const ENCYCLOPEDIA_DATA: EncyclopediaEntry[] = [
  {
    id: 'geo-1',
    title: '南港層 (Nangang Formation)',
    category: 'Geology',
    summary: '台北盆地周邊常見的地層，富含化石。',
    content: '南港層主要由厚層的砂岩和薄層的頁岩互層組成。這個地層形成於約1000萬年前的淺海環境，因此經常可以發現貝類化石（如海扇、牡蠣）以及生痕化石（古生物在沉積物中活動留下的痕跡）。在永春陂周邊，觀察岩石的「羽毛狀節理」是辨識此地層的重要特徵。',
    relatedMissionId: '2'
  },
  {
    id: 'geo-2',
    title: '四獸山 (Four Beasts Mts)',
    category: 'Geology',
    summary: '虎、豹、獅、象四座山頭的總稱。',
    content: '四獸山位於台北盆地東南緣，由虎山、豹山、獅山、象山組成。這些山頭其實是南港山系向西延伸的支稜。由於差異侵蝕作用，較硬的砂岩保留下來形成山峰，較軟的頁岩或斷層帶則受侵蝕形成山谷（如永春陂所在的凹地）。',
    relatedMissionId: '1'
  },
  {
    id: 'geo-5',
    title: '永春陂窪地成因 (Basin Formation)',
    category: 'Geology',
    summary: '為何四獸山圍繞出一個低窪地？',
    content: '永春陂所在地是一個天然的凹地，四周被虎、豹、獅、象四獸山環繞。這種地形的形成主要與岩層的軟硬差異有關。周圍山頭由堅硬的南港層砂岩組成，不易被侵蝕而形成高地；而中間的區域可能因岩層較軟（如頁岩較多）或位於構造上的弱帶，長年受雨水沖刷侵蝕較快，因而形成低窪的集水區，是典型的差異侵蝕地形。',
    relatedMissionId: '1'
  },
  {
    id: 'geo-3',
    title: '擋土牆與排水 (Retaining Walls)',
    category: 'Tech',
    summary: '保護邊坡穩定的人造結構。',
    content: '在山坡地開發中，擋土牆用於抵抗土壓力，防止邊坡滑動。觀察擋土牆時，除了結構是否龜裂，最重要的就是「排水孔」。若排水孔堵塞，大雨時牆後水壓過高，極易造成崩塌。良好的排水設施（如洩水孔、截水溝）是坡地安全的關鍵。',
    relatedMissionId: 's1'
  },
  {
    id: 'hist-1',
    title: '永春陂的演變 (History)',
    category: 'History',
    summary: '從陂塘、軍營到濕地公園的百年變遷。',
    content: '清代時期，「陂」是指為了灌溉農田而修築的蓄水池。永春陂原為福建永春人開墾之地。日治時期至民國時期，此地逐漸轉為軍事用途（永春營區），陂塘被填平興建營舍。直到近年軍隊撤離，市府透過生態工法引水，讓它恢復為具備滯洪與生態功能的濕地公園。',
  },
  {
    id: 'eco-1',
    title: '濕地生態功能 (Wetlands)',
    category: 'Ecology',
    summary: '都市之肺與天然的淨水廠。',
    content: '永春陂生態濕地公園利用梯田式的設計，延長水流路徑。透過水生植物（如荷花、香蒲）吸附水中的懸浮微粒與營養鹽，達到淨化水質的效果。同時，濕地也為翠鳥、白鷺鷥等鳥類提供了豐富的覓食棲地。',
  },
  {
    id: 'geo-4',
    title: '等高線 (Contour Lines)',
    category: 'Geology',
    summary: '地圖上表示地形高低的線條。',
    content: '等高線是將地面上高度相同的點連成的閉合曲線。等高線越密集，代表坡度越陡峭（如爬升永春崗的路段）；等高線越稀疏，代表坡度越平緩（如公園內部的步道）。判讀等高線是野外調查與登山的基本技能。',
    relatedMissionId: '3'
  }
];

export const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({ onClose, completedPuzzleIds }) => {
  const [selectedCategory, setSelectedCategory] = useState<EncyclopediaCategory | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<EncyclopediaEntry | null>(null);

  const filteredData = ENCYCLOPEDIA_DATA.filter(entry => {
    const matchesCategory = selectedCategory === 'All' || entry.category === selectedCategory;
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (cat: EncyclopediaCategory) => {
    switch (cat) {
      case 'Geology': return <Mountain className="w-4 h-4" />;
      case 'Ecology': return <Sprout className="w-4 h-4" />;
      case 'History': return <History className="w-4 h-4" />;
      case 'Tech': return <Database className="w-4 h-4" />;
    }
  };

  return (
    <div className="absolute inset-0 z-[1200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col md:flex-row h-[85vh] shadow-2xl">
        
        {/* Left Sidebar (List) */}
        <div className={`flex-1 flex flex-col bg-slate-50 border-r border-slate-200 ${selectedEntry ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-bold font-mono text-teal-700 flex items-center gap-2">
              <Book className="w-5 h-5" />
              FIELD ENCYCLOPEDIA
            </h2>
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-800">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search & Filter */}
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search database..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm font-mono focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['All', 'Geology', 'History', 'Ecology', 'Tech'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono whitespace-nowrap transition-all ${
                    selectedCategory === cat 
                      ? 'bg-teal-600 text-white shadow-md' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredData.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md group ${
                  selectedEntry?.id === entry.id 
                    ? 'bg-white border-teal-500 shadow-md' 
                    : 'bg-white border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1 ${
                    entry.category === 'Geology' ? 'bg-amber-100 text-amber-700' :
                    entry.category === 'History' ? 'bg-purple-100 text-purple-700' :
                    entry.category === 'Ecology' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {getCategoryIcon(entry.category)}
                    {entry.category}
                  </span>
                  
                  {/* Indicator if related to a completed mission */}
                  {entry.relatedMissionId && completedPuzzleIds.includes(entry.relatedMissionId) && (
                    <span className="text-teal-600">
                      <Hash className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 mb-1 group-hover:text-teal-700 transition-colors">{entry.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{entry.summary}</p>
              </button>
            ))}

            {filteredData.length === 0 && (
              <div className="text-center py-10 text-slate-400 font-mono text-sm">
                NO ENTRIES FOUND
              </div>
            )}
          </div>
        </div>

        {/* Right Detail View */}
        <div className={`flex-1 bg-white flex-col ${selectedEntry ? 'flex' : 'hidden md:flex'}`}>
          {selectedEntry ? (
            <>
              {/* Detail Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div>
                   <div className="flex items-center gap-2 mb-2">
                      <button 
                        onClick={() => setSelectedEntry(null)}
                        className="md:hidden p-1 bg-white border border-slate-200 rounded-full text-slate-500 mr-2"
                      >
                         <ChevronRight className="w-4 h-4 rotate-180" />
                      </button>
                      <span className={`px-2 py-1 rounded text-xs font-mono font-bold uppercase ${
                          selectedEntry.category === 'Geology' ? 'bg-amber-100 text-amber-700' :
                          selectedEntry.category === 'History' ? 'bg-purple-100 text-purple-700' :
                          selectedEntry.category === 'Ecology' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-200 text-slate-700'
                      }`}>
                          {selectedEntry.category}
                      </span>
                   </div>
                   <h2 className="text-2xl font-bold text-slate-900 font-mono">{selectedEntry.title}</h2>
                </div>
                
                {/* Close Button for Mobile (Top-Right of Detail View) */}
                <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-800">
                    <X className="w-6 h-6" />
                </button>

                {/* Close Button for Desktop */}
                <button onClick={onClose} className="hidden md:block text-slate-400 hover:text-slate-800">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-8">
                  <div className="prose prose-slate max-w-none">
                     <p className="text-lg text-slate-600 leading-relaxed font-sans">
                       {selectedEntry.content}
                     </p>
                  </div>
                  
                  {selectedEntry.relatedMissionId && (
                    <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${completedPuzzleIds.includes(selectedEntry.relatedMissionId) ? 'bg-teal-500' : 'bg-slate-300'}`}></div>
                        <span className="text-xs font-mono text-slate-500">
                            {completedPuzzleIds.includes(selectedEntry.relatedMissionId) 
                                ? 'DATA VERIFIED BY FIELD MISSION' 
                                : 'RELATED FIELD DATA NOT YET COLLECTED'}
                        </span>
                    </div>
                  )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 relative">
               {/* Empty State Close Button for Desktop */}
               <div className="absolute top-4 right-4 hidden md:block">
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-800">
                        <X className="w-6 h-6" />
                    </button>
               </div>
               
               <Book className="w-24 h-24 mb-4 opacity-20" />
               <p className="font-mono text-sm">SELECT AN ENTRY TO VIEW DETAILS</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
