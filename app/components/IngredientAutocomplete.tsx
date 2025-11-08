'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { X, ChevronDown, Loader2 } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  last_price: number;
}

interface IngredientAutocompleteProps {
  value: string; // Selected ingredient ID
  onChange: (ingredient: Ingredient | null) => void;
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function IngredientAutocomplete({
  value,
  onChange,
  excludeIds = [],
  placeholder = 'Search ingredient...',
  disabled = false,
}: IngredientAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch selected ingredient details when value changes
  useEffect(() => {
    if (value && !selectedIngredient) {
      fetchIngredientById(value);
    } else if (!value) {
      setSelectedIngredient(null);
    }
  }, [value]);

  // Fetch ingredient by ID
  const fetchIngredientById = async (id: string) => {
    try {
      const response = await fetch(`/api/ingredients/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedIngredient(data);
        setSearchTerm(data.name);
      }
    } catch (error) {
      console.error('Error fetching ingredient:', error);
    }
  };

  // Fetch suggestions when search term changes
  useEffect(() => {
    if (searchTerm.length >= 2 && !selectedIngredient) {
      fetchSuggestions(searchTerm);
    } else if (searchTerm.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [searchTerm, selectedIngredient]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const fetchSuggestions = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ingredients/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      const data = await response.json();
      
      // Filter out excluded ingredients
      const filtered = data.filter(
        (ing: Ingredient) => !excludeIds.includes(ing.id)
      );
      
      setSuggestions(filtered);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    
    // If user is typing and there's a selection, clear it
    if (selectedIngredient && newValue !== selectedIngredient.name) {
      handleClear();
    }
  };

  const handleSelect = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setSearchTerm(ingredient.name);
    onChange(ingredient);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setSelectedIngredient(null);
    setSearchTerm('');
    onChange(null);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (isOpen && suggestions.length > 0) {
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
        } else if (searchTerm.length >= 2) {
          fetchSuggestions(searchTerm);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;

      case 'Backspace':
        if (selectedIngredient && searchTerm === selectedIngredient.name) {
          e.preventDefault();
          handleClear();
        }
        break;
    }
  };

  const handleFocus = () => {
    if (searchTerm.length >= 2 && !selectedIngredient) {
      setIsOpen(true);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (ing) => !excludeIds.includes(ing.id)
  );

  const displayValue = selectedIngredient ? selectedIngredient.name : searchTerm;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          disabled={disabled || !!selectedIngredient}
          readOnly={!!selectedIngredient}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 ${
            disabled || selectedIngredient
              ? 'bg-gray-50 cursor-not-allowed'
              : 'border-gray-300'
          } ${
            selectedIngredient ? 'cursor-default' : ''
          }`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedIngredient && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {!selectedIngredient && (
            <>
              {isLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
              {!isLoading && (
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    isOpen ? 'transform rotate-180' : ''
                  }`}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !selectedIngredient && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Searching...</p>
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              {searchTerm.length < 2 ? (
                <p className="text-sm">Type at least 2 characters to search</p>
              ) : (
                <p className="text-sm">No ingredients found</p>
              )}
            </div>
          ) : (
            <ul className="py-1" role="listbox">
              {filteredSuggestions.map((ingredient, index) => (
                <li
                  key={ingredient.id}
                  role="option"
                  aria-selected={selectedIndex === index}
                  className={`px-4 py-2 cursor-pointer transition-colors ${
                    selectedIndex === index
                      ? 'bg-blue-100 text-blue-900'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                  onClick={() => handleSelect(ingredient)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ingredient.name}</span>
                    <span className="text-sm text-gray-500">{ingredient.unit}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}






