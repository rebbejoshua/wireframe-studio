import React, { useState, useEffect, useRef } from 'react';
import Sortable from 'sortablejs';
import {
  Layers,
  X,
  PenTool,
  Download,
  Plus,
  MessageSquare,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';

export const WireframeStudio = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [showElementLabels, setShowElementLabels] = useState(false);
  const sortableInstances = useRef([]);
  const [comments, setComments] = useState({});
  const [activeCommentTarget, setActiveCommentTarget] = useState(null);
  const [commentText, setCommentText] = useState('');

  // Global toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsActive((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sortable Injection Engine
  useEffect(() => {
    if (!isActive) {
      // Destroy all instances when turning off
      sortableInstances.current.forEach((inst) => inst.destroy());
      sortableInstances.current = [];
      document.body.classList.remove('wireframe-mode-active');
      return;
    }

    document.body.classList.add('wireframe-mode-active');

    // 1. Setup Outer Containers (Grid/Flex) to only drag Cards
    const outerContainers = Array.from(
      document.querySelectorAll(
        '.grid, .flex, [class*="space-y-"], [class*="space-x-"]'
      )
    ).filter((el) => {
      const hasCards = el.querySelector('.dev-wireframe-item');
      const isNotNav = !el.closest('nav') && !el.closest('#dev-tools-layer');
      return hasCards && isNotNav;
    });

    outerContainers.forEach((container) => {
      container.classList.add('dev-drop-zone');
      const sortable = Sortable.create(container, {
        group: 'wireframe-cards',
        draggable: '.dev-wireframe-item', // Only Cards can be dragged here
        animation: 150,
        ghostClass: 'dev-sortable-ghost',
        dragClass: 'dev-sortable-drag',
        fallbackOnBody: true,
        swapThreshold: 0.65,
        onEnd: (evt) => {
          if (evt.from.children.length === 0)
            evt.from.classList.add('dev-column-collapsed');
          if (evt.to.children.length > 0)
            evt.to.classList.remove('dev-column-collapsed');
        },
      });
      sortableInstances.current.push(sortable);
    });

    // 2. Setup Inner Containers (Cards) to drag internal elements (Buttons, Inputs)
    const cards = Array.from(document.querySelectorAll('.dev-wireframe-item'));
    cards.forEach((card) => {
      const sortable = Sortable.create(card, {
        group: 'wireframe-inner', // Isolated group, cannot mix with 'wireframe-cards'
        draggable:
          'button, input, textarea, select, label, [class*="btn"], p, h1, h2, h3, h4', // Elements allowed to be rearranged inside
        animation: 150,
        ghostClass: 'dev-sortable-ghost-inner',
        fallbackOnBody: true,
      });
      sortableInstances.current.push(sortable);
    });

    toast.success(
      'Structure Mode Active: Cards & inner elements can be moved and resized!'
    );
  }, [isActive]);

// Interceptors for Comments & Disabling App Logic
  useEffect(() => {
    if (!isActive) return;

    // Prevent native app interactions (forms, links) so we don't trigger anything while interacting
    const handleClick = (e) => {
      if (
        e.target.closest('#dev-tools-layer') ||
        e.target.closest('.dev-comment-popover')
      )
        return;

      e.preventDefault();
      e.stopPropagation();

      // Add a visual 'selected' highlight state on single-click
      document.querySelectorAll('.dev-selected-item').forEach((el) => {
        el.classList.remove('dev-selected-item');
      });

      const itemTarget = e.target.closest(
        '.dev-wireframe-item, button, input, textarea'
      );
      if (itemTarget) {
        itemTarget.classList.add('dev-selected-item');
      }
    };

    // Double-click to drop an annotation / comment
    const handleDoubleClick = (e) => {
      if (
        e.target.closest('#dev-tools-layer') ||
        e.target.closest('.dev-comment-popover')
      )
        return;

      e.preventDefault();
      e.stopPropagation();

      const itemTarget =
        e.target.closest('.dev-wireframe-item') || e.target.closest('div');

      if (itemTarget) {
        // Generate a unique selector or ID for this DOM node if it doesn't have one
        if (!itemTarget.dataset.devId) {
          itemTarget.dataset.devId =
            'node_' + Math.random().toString(36).substr(2, 9);
        }
        setActiveCommentTarget(itemTarget);
        setCommentText(comments[itemTarget.dataset.devId] || '');
      }
    };

    // Use capture phase to kill events before React gets them
    document.addEventListener('click', handleClick, true);
    document.addEventListener('dblclick', handleDoubleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('dblclick', handleDoubleClick, true);
    };
  }, [isActive, comments]);

  const saveComment = () => {
    if (!activeCommentTarget) return;
    setComments((prev) => ({
      ...prev,
      [activeCommentTarget.dataset.devId]: commentText,
    }));
    // Visually mark the annotated element in the live DOM
    activeCommentTarget.classList.add('dev-annotated');
    setActiveCommentTarget(null);
  };

  const handleExport = () => {
    const changes = Object.entries(comments)
      .map(([id, note]) => `- **Element [${id}]**: ${note}`)
      .join('\n');
    const structureMarkdown = `
# Developer Structural Feedback

I have reorganized the live DOM layout. Please update the CSS grid/flex structures to match the intent below, and process these component-level adjustments:

### Annotations:
${changes || '*No specific text comments left. Match visual changes if screenshot provided.*'}
    `.trim();

    navigator.clipboard.writeText(structureMarkdown);
    toast.success('Structural Feedback Payload Copied!');
  };

  const injectEmptyColumn = () => {
    // Find the main grid
    const mainGrid = document.querySelector('.grid');
    if (!mainGrid) {
      toast.error('No active grid found to inject into.');
      return;
    }

    const newCol = document.createElement('div');
    newCol.className =
      'dev-explicit-column border-2 border-dashed border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 min-h-[200px] rounded-xl flex flex-col items-center justify-center p-4 transition-all col-span-1';
    newCol.innerHTML =
      '<span class="text-indigo-400 font-bold text-xs uppercase tracking-widest pointer-events-none">Drop Items Here</span>';

    mainGrid.appendChild(newCol);

    // Wire it up to Sortable natively
    const sortable = Sortable.create(newCol, {
      group: 'wireframe-shared',
      animation: 150,
      ghostClass: 'dev-sortable-ghost',
      dragClass: 'dev-sortable-drag',
    });
    sortableInstances.current.push(sortable);

    toast.success('Injected new empty structural column!');
  };

  // Add styles dynamically when active
  useEffect(() => {
    if (!isActive) return;
    const style = document.createElement('style');
    style.id = 'wireframe-styles';
    style.innerHTML = `
      /* Enable physical resizing handles natively */
      .wireframe-mode-active .dev-wireframe-item,
      .wireframe-mode-active button,
      .wireframe-mode-active input,
      .wireframe-mode-active textarea {
         resize: both !important;
         overflow: auto !important; 
         outline: 1px dashed rgba(99, 102, 241, 0.4);
      }
      
      .wireframe-mode-active * {
         user-select: none !important;
      }
      
      .dev-drop-zone {
         min-height: 100px;
         transition: background 0.2s, min-height 0.2s;
         padding-bottom: 20px;
      }
      .dev-sortable-ghost {
         opacity: 0.2;
         background-color: #e2e8f0;
         border: 2px dashed #94a3b8;
      }
      .dev-sortable-ghost-inner {
         opacity: 0.3;
         background-color: #e0e7ff;
      }
      .dev-sortable-drag {
         opacity: 1 !important;
         box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
         transform: scale(1.02);
         z-index: 99999 !important;
      }
      .dev-column-collapsed {
         display: none !important;
      }
      .dev-selected-item {
         outline: 3px solid #6366f1 !important;
         outline-offset: 2px;
         box-shadow: 0 0 20px rgba(99, 102, 241, 0.3) !important;
         z-index: 50;
      }
      .dev-annotated {
         position: relative;
      }
      .dev-annotated::after {
         content: '📍';
         position: absolute;
         top: -10px;
         right: -10px;
         font-size: 20px;
         z-index: 50;
         background: white;
         border-radius: 50%;
         box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('wireframe-styles');
      if (el) el.remove();
    };
  }, [isActive]);

  // X-Ray Overlay: Appends dynamic floating developer identification labels
  useEffect(() => {
    if (!showElementLabels) return;

    const overlayLayer = document.createElement('div');
    overlayLayer.id = 'dev-labels-overlay';
    // Fixed container covers viewport completely on top of everything.
    overlayLayer.style.position = 'fixed';
    overlayLayer.style.top = '0';
    overlayLayer.style.left = '0';
    overlayLayer.style.width = '100vw';
    overlayLayer.style.height = '100vh';
    overlayLayer.style.pointerEvents = 'none';
    overlayLayer.style.zIndex = '2147483647'; // Max z-index
    document.body.appendChild(overlayLayer);

    const updateLabels = () => {
      overlayLayer.innerHTML = ''; // Clear frame
      
      const queries = [
        { sel: '.dev-wireframe-item', title: 'Card', color: '#ec4899' }, // pink
        { sel: 'button:not(#dev-tools-layer button)', title: 'Button', color: '#3b82f6' }, // blue
        { sel: 'input, textarea', title: 'Input', color: '#f59e0b' }, // amber
        { sel: 'nav', title: 'Nav', color: '#10b981' }, // emerald
        { sel: 'aside', title: 'Sidebar', color: '#059669' }, // emerald darker
        { sel: 'a:not(nav a)', title: 'Link', color: '#8b5cf6' }, // purple
      ];

      queries.forEach(q => {
        document.querySelectorAll(q.sel).forEach((el) => {
          const rect = el.getBoundingClientRect();
          // Render only elements visible in the viewport to save memory
          if (rect.width > 2 && rect.height > 2 && rect.top < window.innerHeight && rect.bottom > 0) {
            
            // The Outline Box
            const box = document.createElement('div');
            box.style.position = 'absolute';
            box.style.top = `${rect.top}px`;
            box.style.left = `${rect.left}px`;
            box.style.width = `${rect.width}px`;
            box.style.height = `${rect.height}px`;
            box.style.border = `2px dashed ${q.color}`;
            box.style.opacity = '0.4';
            overlayLayer.appendChild(box);

            // The Label Badge
            const badge = document.createElement('div');
            badge.innerText = q.title;
            badge.style.position = 'absolute';
            badge.style.top = `${rect.top - 12}px`;
            badge.style.left = `${rect.left - 4}px`;
            badge.style.background = q.color;
            badge.style.color = 'white';
            badge.style.fontSize = '9px';
            badge.style.fontWeight = 'bold';
            badge.style.textTransform = 'uppercase';
            badge.style.letterSpacing = '1px';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.border = '1px solid white';
            badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            overlayLayer.appendChild(badge);
          }
        });
      });
    };

    let rAF;
    const loop = () => {
      updateLabels();
      rAF = requestAnimationFrame(loop);
    };
    rAF = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rAF);
      if (overlayLayer.parentNode) {
        overlayLayer.parentNode.removeChild(overlayLayer);
      }
    };
  }, [showElementLabels]);

  return (
    <>
      <div className="dev-wireframe-children-wrapper">{children}</div>

      {/* Commenting Popover */}
      {activeCommentTarget && (
        <div className="dev-comment-popover fixed inset-0 z-[100000] flex items-center justify-center pointer-events-auto bg-slate-900/10 shadow-2xl">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-96 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg mb-4 flex items-center">
              <MessageSquare className="mr-2 text-indigo-500" size={18} />{' '}
              Attach Annotation
            </h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="e.g. Expand this card to span 2 columns..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4 min-h-[100px]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActiveCommentTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={saveComment}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-md"
              >
                Save Pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dev Tools Panel */}
      <div
        id="dev-tools-layer"
        className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end space-y-4"
      >
        {isActive && (
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 w-72 flex flex-col space-y-3 animate-in slide-in-from-right border border-slate-700">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="font-bold flex items-center text-sm">
                <PenTool size={16} className="mr-2 text-blue-400" /> Structure
                Mode
              </h3>
              <button
                onClick={() => setIsActive(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Drag UI blocks to restructure the live DOM layout. Clicking any
              block drops an annotation pin.
            </p>

            <button
              onClick={injectEmptyColumn}
              className="w-full py-2 px-3 border-2 border-dashed border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
            >
              <Plus size={16} className="mr-1" /> Inject Empty Column
            </button>

            <button
              onClick={handleExport}
              className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
            >
              <Download size={16} className="mr-2" /> Export Structural Payload
            </button>
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/50 hover:-translate-y-1 transition-all duration-300 ease-in-out border-2 ${isActive ? 'bg-blue-600 hover:bg-blue-400 border-blue-300 animate-pulse scale-110' : 'bg-blue-900 hover:bg-blue-500 border-blue-700 hover:border-blue-400'}`}
            title="Toggle Structural Restructure Mode"
          >
            <Layers className="text-white w-6 h-6" />
          </button>
          
          <button
            onClick={() => setShowElementLabels(!showElementLabels)}
            className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center shadow shadow-black/30 hover:shadow-md hover:shadow-black/50 hover:-translate-y-0.5 transition-all duration-300 ease-in-out border-2 z-10 ${showElementLabels ? 'bg-fuchsia-600 hover:bg-fuchsia-400 border-fuchsia-300 animate-pulse scale-110' : 'bg-fuchsia-900 hover:bg-fuchsia-500 border-fuchsia-700 hover:border-fuchsia-400'}`}
            title="Toggle Element Labels"
          >
            <Key className="text-white w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
