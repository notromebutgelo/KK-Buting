import { formatPoints } from '@/utils/formatPoints'
import Spinner from '@/components/ui/Spinner'

interface PointsCardProps {
  totalPoints: number
  earnedPoints?: number
  redeemedPoints?: number
  isLoading?: boolean
}

export default function PointsCard({ totalPoints, earnedPoints, redeemedPoints, isLoading }: PointsCardProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-green-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-10 -translate-x-10" />

      <div className="relative z-10">
        <p className="text-green-100 text-sm font-medium mb-1">Available Points</p>
        {isLoading ? (
          <div className="flex items-center gap-2 h-10">
            <Spinner size="sm" className="border-white/30 border-t-white" />
          </div>
        ) : (
          <p className="text-4xl font-bold tracking-tight">{formatPoints(totalPoints)}</p>
        )}
        <p className="text-green-200 text-xs mt-0.5">KK Points</p>

        {(earnedPoints !== undefined || redeemedPoints !== undefined) && (
          <div className="flex gap-4 mt-4 pt-3 border-t border-white/20">
            {earnedPoints !== undefined && (
              <div>
                <p className="text-green-200 text-xs">Earned</p>
                <p className="text-white font-semibold">{formatPoints(earnedPoints)}</p>
              </div>
            )}
            {redeemedPoints !== undefined && (
              <div>
                <p className="text-green-200 text-xs">Redeemed</p>
                <p className="text-white font-semibold">{formatPoints(redeemedPoints)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
