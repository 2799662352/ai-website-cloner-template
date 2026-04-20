import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Tag, Avatar, Empty } from 'antd';
import { UserOutlined, TagOutlined, StarFilled, PictureOutlined, VideoCameraOutlined, AudioOutlined } from '@ant-design/icons';
import type { TokenSuggestion } from './characterCardTokenManager';
import './TokenAutocomplete.css';

interface TokenAutocompleteProps {
  visible: boolean;
  suggestions: TokenSuggestion[];
  selectedIndex: number;
  position: { top: number; left: number };
  onSelect: (token: string) => void;
  onClose: () => void;
  onHover?: (index: number) => void;
  loading?: boolean;
}

const TokenAutocomplete: React.FC<TokenAutocompleteProps> = ({
  visible, suggestions, selectedIndex, position, onSelect, onClose, onHover, loading = false,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const items = listRef.current.querySelectorAll('.token-suggestion-item');
      (items[selectedIndex] as HTMLElement)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleClick = useCallback((e: React.MouseEvent, token: string) => {
    e.preventDefault(); e.stopPropagation(); onSelect(token);
  }, [onSelect]);

  useEffect(() => {
    if (!visible) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.token-autocomplete-container')) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClickOutside); };
  }, [visible, onClose]);

  // Estimate the dropdown height from the current suggestion list; avoids a
  // measure-then-setState cycle inside a layout effect, which triggers the
  // `react-hooks/set-state-in-effect` rule.
  const flipped = useMemo(() => {
    if (!visible) return false;
    const rowHeight = 56;
    const headerFooter = 44;
    const estimatedHeight = Math.min(360, headerFooter + Math.max(1, suggestions.length) * rowHeight);
    const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - position.top : Infinity;
    return spaceBelow < estimatedHeight && position.top > spaceBelow;
  }, [visible, position, suggestions]);

  if (!visible) return null;

  const menuWidth = 440;
  const adjustedLeft = Math.min(position.left, window.innerWidth - menuWidth - 10);
  const style: React.CSSProperties = {
    position: 'fixed', left: Math.max(10, adjustedLeft), zIndex: 2147483647,
  };
  if (flipped) { style.bottom = window.innerHeight - position.top + 8; }
  else { style.top = position.top; }

  const dropdown = (
    <div ref={containerRef} className="token-autocomplete-container" style={style}>
      <div className="token-autocomplete-content" ref={listRef}>
        {loading ? (
          <div className="token-autocomplete-loading">加载中...</div>
        ) : suggestions.length === 0 ? (
          <Empty description="没有找到匹配的 Token" imageStyle={{ height: 40 }} />
        ) : (
          <div className="token-suggestion-list">
            {suggestions.map((item, index) => (
              <div
                key={item.key}
                className={`token-suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                onMouseEnter={() => onHover?.(index)}
                onMouseDown={(e) => handleClick(e, item.key)}
              >
                <div className="token-suggestion-content">
                  <div className="token-suggestion-icon">
                    {item.type === 'image_ref' ? (
                      item.thumbnail ? (
                        <Avatar src={item.thumbnail} size={32} shape="square" style={{ borderRadius: 4 }} />
                      ) : (() => {
                        const mt = item.metadata?.mediaType;
                        const cfg = mt === 'video' ? { icon: <VideoCameraOutlined />, bg: '#36cfc9' }
                          : mt === 'audio' ? { icon: <AudioOutlined />, bg: '#722ed1' }
                          : { icon: <PictureOutlined />, bg: '#1677ff' };
                        return <Avatar icon={cfg.icon} size={32} shape="square" style={{ backgroundColor: cfg.bg, borderRadius: 4 }} />;
                      })()
                    ) : item.thumbnail ? (
                      <Avatar src={item.thumbnail} size={32} shape="square" />
                    ) : (
                      <Avatar
                        icon={item.type === 'character' ? <UserOutlined /> : <TagOutlined />}
                        size={32}
                        style={{ backgroundColor: item.type === 'character' ? '#1890ff' : '#52c41a' }}
                      />
                    )}
                  </div>
                  <div className="token-suggestion-info">
                    <div className="token-suggestion-header">
                      <span className="token-key">{item.metadata?.displayLabel ? `【@${item.metadata.displayLabel}】` : item.key}</span>
                      <Tag
                        color={
                          item.type === 'image_ref'
                            ? (item.metadata?.mediaType === 'video' ? 'cyan' : item.metadata?.mediaType === 'audio' ? 'purple' : 'processing')
                            : item.type === 'character' ? 'blue' : 'green'
                        }
                        style={{ marginLeft: 8 }}
                      >
                        {item.category}
                      </Tag>
                      {item.isFavorite && <StarFilled style={{ color: '#faad14', marginLeft: 4 }} />}
                    </div>
                    <div className="token-suggestion-value">{item.value}</div>
                  </div>
                  <div className="token-suggestion-stats">
                    {item.type === 'image_ref' ? (
                      <span className="image-ref-badge">{item.metadata?.emoji || '📷'}</span>
                    ) : (
                      <span className="usage-count">使用 {item.usageCount} 次</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="token-autocomplete-footer">
          <span>↑↓ 选择</span><span>Enter 确认</span><span>Esc 取消</span>
        </div>
      </div>
    </div>
  );

  return createPortal(dropdown, document.body);
};

export default TokenAutocomplete;
