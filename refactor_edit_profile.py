import re

with open('src/pages/EditProfile.tsx', 'r') as f:
    content = f.read()

# Remove the banner and featured sections from the return statement
# The banner starts at {/* Banner */} and ends before {/* Profile Sheet */}
start_marker = "{/* Banner */}"
end_marker = "{/* Profile Sheet */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# Remove the Profile Sheet Modal Wrapper
# Replace AnimatePresence and isProfileModalOpen wrapper
modal_wrapper_start = """      {/* Profile Sheet */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`w-full h-full relative flex flex-col ${
                isDarkMode ? "bg-black" : "bg-white"
              }`}
            >"""

modal_wrapper_replacement = """      {/* Edit Profile Form */}
      <div className={`w-full max-w-5xl mx-auto flex-1 relative flex flex-col mt-8 brutalist-border brutalist-shadow mb-12 ${
        isDarkMode ? "bg-black" : "bg-white"
      }`}>"""

content = content.replace(modal_wrapper_start, modal_wrapper_replacement)

# Remove the closing tags for the modal wrapper
modal_wrapper_end = """            </motion.div>
          </div>
        )}
      </AnimatePresence>"""

modal_wrapper_end_replacement = """      </div>"""

content = content.replace(modal_wrapper_end, modal_wrapper_end_replacement)

# Remove the Support Modal and Contact Modal and AuthSidebar at the end
support_contact_start = """      {/* Support Sheet */}"""
support_contact_end = """  );
}"""

sc_start_idx = content.find(support_contact_start)
sc_end_idx = content.rfind(support_contact_end)

if sc_start_idx != -1 and sc_end_idx != -1:
    content = content[:sc_start_idx] + "  );\n}"

with open('src/pages/EditProfile.tsx', 'w') as f:
    f.write(content)

print("EditProfile.tsx refactored successfully.")
