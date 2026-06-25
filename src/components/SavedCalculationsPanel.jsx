// Saved Calculations side panel — presentational. State lives in App (so the
// viewed calc can drive the rest of the page); this component receives it and
// the callbacks as props. Behaviour is unchanged from the inline version.
function SavedCalculationsPanel({
  savedCalcs, viewingCalc, editingIdx, tempNames,
  setEditingIdx, setTempNames, setSavedCalcs, onCompare, onDelete,
}) {
  if (savedCalcs.length === 0) return null;

  return (
    <div className="saved-list-vertical">
      <span className="saved-list-title">Saved Calculations</span>
      <ul className="saved-list-ul">
        {savedCalcs.map((c, i) => {
          const editing = editingIdx === i;
          const tempName = tempNames[i] || c.name || c.summary;
          function handleRenameStart() {
            setEditingIdx(i);
            setTempNames(prev => prev.map((n, idx) => idx === i ? c.name || c.summary : n));
          }
          function handleRenameSave() {
            setEditingIdx(null);
            setSavedCalcs(prev => prev.map((item, idx) => {
              if (idx === i) {
                let newName = tempName.trim();
                if (newName === '') {
                  newName = `Calculation ${idx + 1}`;
                }
                return { ...item, name: newName };
              }
              return item;
            }));
          }
          function handleRenameCancel() {
            setEditingIdx(null);
            setTempNames(prev => prev.map((n, idx) => idx === i ? c.name || c.summary : n));
          }
          return (
            <li key={c.ts} className={`saved-item-vertical${viewingCalc && viewingCalc.ts === c.ts ? ' selected' : ''}`}>
              <div className="saved-item-main">
                <button className="saved-item-summary" onClick={() => onCompare(i)}>{c.name && c.name.trim() !== '' ? c.name : c.summary}</button>
                <button className="delete-btn" onClick={() => onDelete(i)} title="Delete">🗑️</button>
              </div>
              <div className="saved-item-actions">
                {!editing ? (
                  <button className="rename-btn" title="Rename calculation" onClick={handleRenameStart}>✏️ Rename</button>
                ) : (
                  <>
                    <input
                      className="rename-input"
                      value={tempName}
                      onChange={e => setTempNames(prev => prev.map((n, idx) => idx === i ? e.target.value : n))}
                      autoFocus
                    />
                    <button className="rename-btn" style={{color:'#10b981'}} onClick={handleRenameSave} title="Save name">💾 Save</button>
                    <button className="rename-btn" style={{color:'#f87171'}} onClick={handleRenameCancel} title="Cancel rename">✖️ Cancel</button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SavedCalculationsPanel;
