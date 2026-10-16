# Focused numbers keep their own colors

Roadmap item: R22 follow-up, from [#106](https://github.com/seanoliver/sudoku/issues/106). On October 15 Sean noted that a focused starting number and a focused entered number both turned bold blue, so the two could not be told apart. He chose direction A (own colors) from three options rendered in the app (own colors, solid starting numbers, underlined entries). Reference: ../designs/focus-own-colors-approved.png and ../designs/focus-own-colors-approved-dark.png.

## Behavior

- A focused number keeps the color it has when it is not focused: ink for starting numbers, blue for entered numbers, red for conflicts.
- Focus is shown by the blue ring and bold weight, which every focused cell gets.
- A mistake hint cell still shows only its red ring.

## Rejected

- **Solid starting numbers:** a focused starting number became a solid blue tile like the lit key. Strongest contrast, but it added a second focus look and was heavy with four or five on the board.
- **Underlined entries:** every focused number stayed bold blue and entered ones got an underline. The mark was cramped at cell size and easy to miss.
