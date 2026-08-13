import type { ResultStatus } from '../../shared/domain';
import type { PhotoReferenceKind } from '../../shared/photo-calibration';
import type {
  PhotoAngularChannelResult,
  PhotoAngularComparisonResult
} from '../../simulation/photo-angular-comparison';
import { useI18n } from './I18nProvider';
import { appLocaleTag, type TranslationKey } from './i18n';
import './photo-angular-comparison.css';
import { PanelHelpButton } from './HelpSystem';

const statusKeys: Record<ResultStatus, TranslationKey> = {
  compatible: 'photo.comparison.status.compatible',
  incompatible: 'photo.comparison.status.incompatible',
  indeterminate: 'photo.comparison.status.indeterminate',
  unsupported: 'photo.comparison.status.unsupported'
};

const channelKeys: Record<PhotoAngularChannelResult['key'], TranslationKey> = {
  targetAngularHeight: 'photo.comparison.channel.targetAngularHeight',
  targetBase: 'photo.comparison.channel.targetBase',
  targetTop: 'photo.comparison.channel.targetTop'
};

export function PhotoAngularComparisonPanel({
  comparisons,
  referenceKind
}: {
  comparisons: PhotoAngularComparisonResult[];
  referenceKind: PhotoReferenceKind;
}): React.JSX.Element | null {
  const { locale, t } = useI18n();
  if (comparisons.length === 0) return null;

  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), {
    maximumFractionDigits: 4
  });
  const formatAngle = (value: number): string => `${angleFormatter.format(value)}°`;

  const hasModelUncertainty = comparisons.some((comparison) =>
    comparison.channels.some((channel) => channel.modelUncertaintyDeg !== undefined)
  );

  return (
    <section className="photo-angular-comparison panel">
      <div className="photo-angular-comparison-heading">
        <div>
          <span className="eyebrow">{t('photo.comparison.eyebrow')}</span>
          <strong>
            {referenceKind === 'local-horizontal'
              ? t('photo.comparison.reference.horizontal')
              : t('photo.comparison.reference.visual')}
          </strong>
        </div>
        <div className="photo-angular-heading-actions">
          <PanelHelpButton panelId="photo-comparison" />
          <span className="photo-angular-independent">{t('photo.comparison.independent')}</span>
        </div>
      </div>

      <p className="photo-angular-note">
        {t('photo.comparison.note')}
        {referenceKind === 'visual-reference'
          ? t('photo.comparison.note.visual')
          : t('photo.comparison.note.horizontal')}
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('photo.comparison.header.model')}</th>
              <th>{t('photo.comparison.header.channel')}</th>
              <th>{t('photo.comparison.header.photo')}</th>
              <th>{t('photo.comparison.header.prediction')}</th>
              <th>{t('photo.comparison.header.combined')}</th>
              <th>{t('photo.comparison.header.difference')}</th>
              <th>{t('photo.comparison.header.result')}</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.flatMap((comparison) => {
              if (comparison.channels.length === 0) {
                return [
                  <tr key={`${comparison.sourceModelId}:none`}>
                    <td>{comparison.sourceModelName}</td>
                    <td colSpan={5}>
                      {comparison.prediction.warnings[0] ?? t('photo.comparison.noChannel')}
                    </td>
                    <td>
                      <span
                        className={`photo-compare-status status-${comparison.prediction.status}`}
                      >
                        {t(statusKeys[comparison.prediction.status])}
                      </span>
                    </td>
                  </tr>
                ];
              }

              return comparison.channels.map((channel, index) => (
                <tr key={`${comparison.sourceModelId}:${channel.key}`}>
                  <td>{index === 0 ? comparison.sourceModelName : ''}</td>
                  <td>{t(channelKeys[channel.key])}</td>
                  <td>
                    {formatAngle(channel.observedDeg)} ±{formatAngle(channel.photoUncertaintyDeg)}
                  </td>
                  <td>
                    {formatAngle(channel.predictedDeg)}
                    {channel.modelUncertaintyDeg === undefined
                      ? ''
                      : ` ±${formatAngle(channel.modelUncertaintyDeg)}`}
                  </td>
                  <td>±{formatAngle(channel.combinedUncertaintyDeg)}</td>
                  <td>{formatAngle(channel.differenceDeg)}</td>
                  <td>
                    <span className={`photo-compare-status status-${channel.status}`}>
                      {t(statusKeys[channel.status])}
                    </span>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      <p className="photo-angular-footnote">
        {t('photo.comparison.footnote')}
        {hasModelUncertainty
          ? t('photo.comparison.footnote.withModel')
          : t('photo.comparison.footnote.withoutModel')}
      </p>
    </section>
  );
}
