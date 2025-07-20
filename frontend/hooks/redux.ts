import { useDispatch, useSelector } from 'react-redux';

// Custom typed hooks for Redux
// Using any for now since slices are JavaScript files
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
