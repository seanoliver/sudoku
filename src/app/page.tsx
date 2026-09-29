import SudokuGame from '@/components/game';
import { MotionProvider } from '@/components/motion-provider';
export default function Page() { return <MotionProvider><SudokuGame/></MotionProvider>; }
