import Image from 'next/image'

interface JerseyIconProps {
  number: number | string | null
}

export default function JerseyIcon({ number }: JerseyIconProps) {
  return (
    <div className="jersey-icon-container">
      <Image 
        src="/jersey.png" 
        alt="Jersey" 
        className="jersey-icon-img"
        width={90}
        height={90}
      />
      {number != null && (
        <div className="jersey-icon-number">{number}</div>
      )}
    </div>
  )
}

