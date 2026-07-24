import { forwardRef } from 'react'
import { isSym } from './useNumeris'
import styles from './numeris.module.css'

interface TileProps extends React.HTMLAttributes<HTMLDivElement> {
  val: string
  used?: boolean
  dragging?: boolean
  isOverlay?: boolean
}

const Tile = forwardRef<HTMLDivElement, TileProps>(
  ({ val, used, dragging, isOverlay, ...props }, ref) => {
    const sym = isSym(val)
    const classes = [
      styles.tile,
      sym ? styles.sym : '',
      used ? styles.used : '',
      dragging ? styles.dragging : '',
      isOverlay ? styles.overlay : '',
    ].filter(Boolean).join(' ')

    return (
      <div ref={ref} className={classes} {...props}>
        {val}
      </div>
    )
  }
)

Tile.displayName = 'Tile'
export default Tile
