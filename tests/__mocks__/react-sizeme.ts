import { ReactNode, useEffect, useState } from 'react'

type PropsWithSize<P> = {
  size: {
    width: number | null
    height: number | null
  }
  props: P[]
}

type FnWithSize<P> = (...propsWithSize: PropsWithSize<P>[]) => ReactNode

export const SizeMe = ({
  children,
}: {
  children: (measurement: { size: { width: number; height: number } }) => ReactNode
}): ReactNode => {
  const [hasMeasured, setHasMeasured] = useState(false)

  // Defer measurement until mount so Grid's outer ref exists before its rows render.
  useEffect(() => {
    setHasMeasured(true)
  }, [])

  if (!hasMeasured) {
    return null
  }

  return children({ size: { width: 1200, height: 500 } })
}

export const withSize =
  <P>(_options: any) =>
  (fn: FnWithSize<P>) =>
  ({ ...props }: { props: P[] }) =>
    fn({ ...props, size: { width: null, height: null } })
