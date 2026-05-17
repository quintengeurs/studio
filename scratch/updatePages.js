const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/projects/page.tsx',
  'src/app/development/page.tsx',
  'src/app/operational/page.tsx',
  'src/app/sports/page.tsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add ActivityKanbanBoard import
  if (!content.includes('ActivityKanbanBoard')) {
    content = content.replace(
      /"use client";\s*/,
      `"use client";\n\nimport { ActivityKanbanBoard } from "@/components/kanban/ActivityKanbanBoard";\n`
    );
  }

  // 2. Add LayoutGrid, ListTodo imports
  if (!content.includes('LayoutGrid')) {
    content = content.replace(
      /  Archive,\n  Inbox\n} from "lucide-react";/,
      `  Archive,\n  Inbox,\n  LayoutGrid,\n  ListTodo\n} from "lucide-react";`
    );
    // Alternate catch if trailing commas exist
    content = content.replace(
      /  Archive,\n  Inbox,\n} from "lucide-react";/,
      `  Archive,\n  Inbox,\n  LayoutGrid,\n  ListTodo\n} from "lucide-react";`
    );
  }

  // 3. Add viewMode state
  if (!content.includes('const [viewMode')) {
    content = content.replace(
      /const \[statusFilter, setStatusFilter\] = useState<string>\("all"\);/,
      `const [statusFilter, setStatusFilter] = useState<string>("all");\n  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');`
    );
  }

  // 4. Add the Toggle buttons
  if (!content.includes('setViewMode(\'board\')')) {
    content = content.replace(
      /                <\/SelectContent>\n              <\/Select>\n            <\/div>\n          <\/div>/,
      `                </SelectContent>\n              </Select>\n              \n              <div className="flex bg-muted p-1 rounded-md shrink-0">\n                <Button \n                  variant={viewMode === 'board' ? 'default' : 'ghost'} \n                  size="sm" \n                  className="h-8 px-3"\n                  onClick={() => setViewMode('board')}\n                >\n                  <LayoutGrid className="h-4 w-4 mr-2" /> Board\n                </Button>\n                <Button \n                  variant={viewMode === 'list' ? 'default' : 'ghost'} \n                  size="sm" \n                  className="h-8 px-3"\n                  onClick={() => setViewMode('list')}\n                >\n                  <ListTodo className="h-4 w-4 mr-2" /> List\n                </Button>\n              </div>\n            </div>\n          </div>`
    );
  }

  // 5. Wrap the grid with the ternary for ActivityKanbanBoard
  // Note: Each page uses a different variable name: filteredProjects, filteredDevelopments, filteredLogs, filteredSports
  const itemMatch = content.match(/filtered([A-Za-z]+)\.filter\([a-z] => [a-z]\.status !== 'Archived'\)\.length > 0 \? \(\s*<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">/);
  
  if (itemMatch && !content.includes('<ActivityKanbanBoard')) {
    const listVar = `filtered${itemMatch[1]}`;
    const mappedVarMatch = content.match(/<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">\s*\{([a-zA-Z]+)\.filter/);
    if(mappedVarMatch) {
       content = content.replace(
         itemMatch[0],
         `${listVar}.filter(e => e.status !== 'Archived').length > 0 ? (\n              viewMode === 'board' ? (\n                <div className="h-[calc(100vh-280px)] min-h-[500px] w-full mt-4">\n                  <ActivityKanbanBoard \n                    activities={${listVar}.filter(e => e.status !== 'Archived')} \n                    onActivityClick={(activity) => openEdit(activity)} \n                    orgId={effectiveOrgId || ''} \n                  />\n                </div>\n              ) : (\n              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`
       );
       
       // Close the ternary
       // The end of the active tab is marked by `))}</div>) : (`
       content = content.replace(
         /                \)\)}\n              <\/div>\n            \) : \(/,
         `                ))}\n              </div>\n              )\n            ) : (`
       );
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
