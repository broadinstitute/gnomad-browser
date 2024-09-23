import { useEffect, useState, useRef } from 'react'

// A custom hook to check when any of the given entries are in the viewport (the top 40%)
//   and when this changes, return the 'id' attribute of this DOM item
const useHeadsObserver = () => {
  const observer = useRef()
  const [activeId, setActiveId] = useState('nothin')

  useEffect(() => {
    const handleObserver = (entries: any[]) => {
      entries.forEach((entry: any) => {
        if (entry?.isIntersecting) {
          setActiveId(entry.target.id)
        }
      })
    }

    // @ts-expect-error
    observer.current = new IntersectionObserver(handleObserver, {
      rootMargin: '0% 0px -90% 0px',
    })

    const elements = document.querySelectorAll('a[id]')
    // @ts-expect-error
    elements.forEach((element) => observer.current.observe(element))
    // @ts-expect-error
    return () => observer.current?.disconnect()
  }, [])

  return { activeId }
}

export default useHeadsObserver
