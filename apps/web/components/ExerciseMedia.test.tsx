import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ExerciseMedia } from './ExerciseMedia';

afterEach(cleanup);

const exercise = {
  id: 'exercise-a',
  name: 'barbell squat',
  imagePath: '/media/exercises/squat.jpg',
  gifPath: '/media/exercises/squat.gif',
  imageUrl: '/media/exercises/squat.jpg',
  gifUrl: '/media/exercises/squat.gif',
};

it('shows the placeholder after a thumbnail image fails without trying the GIF', () => {
  render(<ExerciseMedia exercise={exercise} variant="thumbnail" />);
  const image = screen.getByRole('img');

  expect(image).toHaveAttribute('src', 'http://localhost:4000/media/exercises/squat.jpg');
  fireEvent.error(image);

  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

it('falls back from GIF to the static image in the detail variant', () => {
  render(<ExerciseMedia exercise={exercise} variant="detail" />);
  const image = screen.getByRole('img');

  expect(image).toHaveAttribute('src', 'http://localhost:4000/media/exercises/squat.gif');
  fireEvent.error(image);

  expect(screen.getByRole('img')).toHaveAttribute(
    'src',
    'http://localhost:4000/media/exercises/squat.jpg',
  );
});
