const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Extract the Subcategories Sidebar code
const sidebarRegex = /\{\(\(\) => \{\s*const currentSidebarCategory =[\s\S]*?activeCategory;\s*if \(!currentSidebarCategory \|\| !SUBCATEGORIES\[currentSidebarCategory\]\) return null;\s*return \(\s*<aside className="w-full md:w-48 shrink-0 md:sticky md:top-48">[\s\S]*?<\/aside>\s*\);\s*\}\)\(\)\}/;

const sidebarMatch = content.match(sidebarRegex);
if (!sidebarMatch) {
  console.error("Could not find sidebar code");
  process.exit(1);
}

// 2. Remove the sidebar from the main content area
content = content.replace(sidebarRegex, '');

// 3. Create the new horizontal filter bar code
const newFilterBarCode = `
          {/* Subcategories Filters */}
          {(() => {
            const currentSidebarCategory = 
              activeCategory === "Products" ? (activeProductCategory === "All" || !activeProductCategory ? null : activeProductCategory) : 
              activeCategory === "SERVICES" ? (activeServiceCategory === "All" || !activeServiceCategory ? null : activeServiceCategory) : 
              activeCategory === "Events" ? (activeEventCategory === "All" || !activeEventCategory ? null : activeEventCategory) : 
              activeCategory === "Community" ? (activeCollectiveCategory === "All" || !activeCollectiveCategory ? null : activeCollectiveCategory) : 
              activeCategory === "Creative & Media" ? (activeArtsCategory === "All" || !activeArtsCategory ? null : activeArtsCategory) : 
              activeCategory;
            if (!currentSidebarCategory || !SUBCATEGORIES[currentSidebarCategory]) return null;
            
            return (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-4 overflow-x-auto no-scrollbar min-w-max pt-4 mt-2 border-t border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActiveSubCategories([])}
                      className={\`text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 \${
                        activeSubCategories.length === 0
                          ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                          : \`text-gray-500 border border-transparent \${!isDarkMode ? "hover:text-white hover:bg-zinc-900 hover:border-white/10" : "hover:text-black hover:bg-gray-50 hover:border-black/10"}\`
                      }\`}
                    >
                      All \${currentSidebarCategory}
                    </button>
                  </div>
                  
                  {SUBCATEGORIES[currentSidebarCategory].map((item, idx) => {
                    if (typeof item === 'string') {
                      const sub = item;
                      return (
                        <button
                          key={sub}
                          onClick={() => {
                            setActiveSubCategories(prev => 
                              prev.includes(sub) 
                                ? prev.filter(s => s !== sub)
                                : [...prev, sub]
                            );
                          }}
                          className={\`shrink-0 text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 \${
                            activeSubCategories.includes(sub)
                              ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                              : \`text-gray-500 border border-transparent \${!isDarkMode ? "hover:text-white hover:bg-zinc-900 hover:border-white/10" : "hover:text-black hover:bg-gray-50 hover:border-black/10"}\`
                          }\`}
                        >
                          {sub}
                        </button>
                      );
                    } else {
                      return (
                        <div key={item.groupName} className="flex items-center gap-2 border-l pl-4 border-gray-200 dark:border-gray-800 shrink-0">
                          <span className={\`text-[10px] font-light uppercase tracking-widest \${isDarkMode ? "text-gray-400" : "text-gray-500"}\`}>
                            {item.groupName}:
                          </span>
                          {item.options.map((sub) => (
                            <button
                              key={sub}
                              onClick={() => {
                                setActiveSubCategories(prev => 
                                  prev.includes(sub) 
                                    ? prev.filter(s => s !== sub)
                                    : [...prev, sub]
                                );
                              }}
                              className={\`shrink-0 text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 \${
                                activeSubCategories.includes(sub)
                                  ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                                  : \`text-gray-500 border border-transparent \${!isDarkMode ? "hover:text-white hover:bg-zinc-900 hover:border-white/10" : "hover:text-black hover:bg-gray-50 hover:border-black/10"}\`
                              }\`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      );
                    }
                  })}
                </motion.div>
              </AnimatePresence>
            );
          })()}
`;

// 4. Insert the new code at the end of the Filter Bar
const filterBarEndRegex = /\{\/\* Main Content \*\/\}/;
content = content.replace(filterBarEndRegex, newFilterBarCode + '\n        </div>\n      </div>\n\n      {/* Main Content */}');

// Wait, the Filter Bar div ends right before {/* Main Content */}. Let's check the exact structure.
// The Filter Bar is:
// <div className="...">
//   <div className="max-w-[1600px] ...">
//     ...
//     {activeCategory === "Creative & Media" && (...)}
//   </div>
// </div>
// {/* Main Content */}

// So we need to insert it inside the max-w-[1600px] div.
// Let's replace the end of the Filter Bar.
const filterBarEndExactRegex = /        <\/div>\n      <\/div>\n\n      \{\/\* Main Content \*\/\}/;
content = content.replace(filterBarEndExactRegex, newFilterBarCode + '\n        </div>\n      </div>\n\n      {/* Main Content */}');

fs.writeFileSync('src/App.tsx', content);
console.log('Updated App.tsx successfully!');
