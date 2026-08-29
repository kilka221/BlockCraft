import React, { useState } from 'react';
import { X, Shield, FileText, CheckCircle, Scale, Building, Mail, RefreshCw } from 'lucide-react';

export type LegalDocType = 'privacy' | 'offer';

interface LegalModalProps {
  isOpen: boolean;
  initialDoc?: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialDoc = 'privacy',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<LegalDocType>(initialDoc);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialDoc);
    }
  }, [isOpen, initialDoc]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#1E1E24] text-zinc-900 dark:text-zinc-100 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-[#25252D]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              {activeTab === 'privacy' ? <Shield className="w-5 h-5" /> : <Scale className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {activeTab === 'privacy' ? 'Политика конфиденциальности' : 'Публичная оферта и условия использования'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Сервис «Схематор» • https://schemator.ru • Редакция от 2026 г.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-[#202026] px-6 gap-2">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'privacy'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white/70 dark:bg-[#1E1E24]'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Политика конфиденциальности (152-ФЗ)</span>
          </button>

          <button
            onClick={() => setActiveTab('offer')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'offer'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white/70 dark:bg-[#1E1E24]'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Публичная оферта и покупка токенов</span>
          </button>
        </div>

        {/* Document Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-6 font-sans">
          {activeTab === 'privacy' ? (
            <div className="space-y-5">
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl text-blue-950 dark:text-blue-200">
                <p className="font-semibold text-xs mb-1">
                  Соблюдение законодательства РФ о защите персональных данных
                </p>
                <p className="text-[11px] text-blue-800 dark:text-blue-300">
                  Настоящая Политика разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки и защиты персональной информации пользователей сервиса <strong>«Схематор»</strong> (домен: <a href="https://schemator.ru" target="_blank" rel="noreferrer" className="underline">https://schemator.ru</a>).
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">1. Общие положения</h3>
                <p>
                  1.1. Использование сервиса <strong>«Схематор»</strong> (включая авторизацию через Яндекс ID, VK ID или Email) означает безоговорочное согласие Пользователя с настоящей Политикой и условиями обработки его персональной информации.
                </p>
                <p>
                  1.2. В случае несогласия с условиями настоящей Политики Пользователь должен немедленно прекратить использование сервиса.
                </p>
                <p>
                  1.3. Оператор осуществляет обработку данных с использованием защищенной облачной инфраструктуры <strong>Yandex Cloud</strong> (ООО «Яндекс.Облако»), серверы которой физически расположены на территории Российской Федерации.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">2. Состав собираемых данных</h3>
                <p>2.1. В рамках функционирования сервиса могут обрабатываться следующие данные:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Идентификатор пользователя (UID) в провайдерах авторизации (Яндекс ID, VK ID);</li>
                  <li>Адрес электронной почты (e-mail);</li>
                  <li>Имя / отображаемое имя (Display Name), переданное провайдером авторизации или указанное при регистрации;</li>
                  <li>Баланс токенов генерации схем и история созданных схем алгоритмов;</li>
                  <li>Технические данные: IP-адрес, данные cookie-файлов, сведения об используемом браузере и типе устройства.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">3. Цели обработки персональных данных</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Идентификация Пользователя в системе для сохранения истории созданных ГОСТ блок-схем;</li>
                  <li>Учет и синхронизация баланса цифровых токенов генерации алгоритмов;</li>
                  <li>Обеспечение безопасной авторизации и предотвращение мошеннических действий;</li>
                  <li>Предоставление технической поддержки и оперативной связи по запросу Пользователя.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">4. Порядок и условия хранения данных</h3>
                <p>
                  4.1. Персональные данные Пользователей хранятся в защищенной базе данных Yandex Database (YDB) с шифрованием каналов передачи данных (TLS/SSL).
                </p>
                <p>
                  4.2. Сервис не передает персональные данные третьим лицам, за исключением случаев, прямо предусмотренных действующим законодательством РФ.
                </p>
                <p>
                  4.3. Пользователь имеет право в любой момент отозвать свое согласие на обработку данных или запросить удаление своего аккаунта, направив запрос на электронную почту: <a href="mailto:support@schemator.ru" className="text-blue-600 dark:text-blue-400 font-semibold underline">support@schemator.ru</a>.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">5. Контакты Оператора</h3>
                <p>
                  По всем вопросам, касающимся обработки персональных данных:
                </p>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/70 text-[11px] space-y-1">
                  <div><strong>Сервис:</strong> Онлайн-платформа «Схематор» (ГОСТ 19.701-90)</div>
                  <div><strong>Веб-сайт:</strong> https://schemator.ru</div>
                  <div><strong>Email службы поддержки / DPO:</strong> <a href="mailto:support@schemator.ru" className="text-blue-600 dark:text-blue-400 underline">support@schemator.ru</a></div>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl text-emerald-950 dark:text-emerald-200">
                <p className="font-semibold text-xs mb-1">
                  Договор публичной оферты на оказание услуг и покупку токенов
                </p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Настоящий документ является официальным предложением (публичной офертой в соответствии со ст. 437 Гражданского кодекса РФ) сервиса <strong>«Схематор»</strong> (домен: <a href="https://schemator.ru" target="_blank" rel="noreferrer" className="underline">https://schemator.ru</a>) заключить договор на оказание услуг по автоматической генерации алгоритмических блок-схем.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">1. Предмет Оферты</h3>
                <p>
                  1.1. Исполнитель предоставляет Заказчику право использования функционала сервиса <strong>«Схематор»</strong> для преобразования исходного программного кода и алгоритмов в графические блок-схемы по стандарту ГОСТ 19.701-90, а также возможность приобретения пакетов цифровых прав на генерацию (токенов).
                </p>
                <p>
                  1.2. Акцептом настоящей Оферты является совершение Заказчиком любого из действий: регистрация/авторизация на сайте, покупка токенов либо генерация схем.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">2. Тарифы и порядок покупки токенов</h3>
                <p>
                  2.1. 1 токен = 1 успешная процедура генерации и компоновки блок-схемы из исходного кода.
                </p>
                <p>
                  2.2. При первичной авторизации каждому Пользователю начисляется <strong>1 бесплатный приветственный токен</strong>.
                </p>
                <p>
                  2.3. Дополнительные пакеты токенов приобретаются через защищенные платежные шлюзы партнеров (банковские карты РФ, СБП). Зачисление токенов на баланс личного кабинета происходит моментально после подтверждения транзакции банком.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">3. Правила возврата денежных средств</h3>
                <p>
                  3.1. В соответствии со статьей 26.1 Закона РФ «О защите прав потребителей» и спецификой предоставления цифровых услуг:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Заказчик вправе потребовать полный возврат средств за приобретенный пакет токенов, если <strong>ни один токен из данного оплаченного пакета не был израсходован</strong>, в течение 14 календарных дней с момента оплаты.</li>
                  <li>Если услуга генерации была оказана некорректно по вине сервиса (технический сбой в работе генератора), списанный токен восстанавливается на баланс автоматически либо через обращение в службу поддержки.</li>
                </ul>
                <p>
                  3.2. Для оформления возврата Заказчик направляет заявление в свободной форме с адреса электронной почты, привязанного к аккаунту, на <a href="mailto:support@schemator.ru" className="text-blue-600 dark:text-blue-400 font-semibold underline">support@schemator.ru</a> с указанием даты и деталей платежа.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">4. Реквизиты Исполнителя</h3>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/70 text-[11px] space-y-1.5 font-mono">
                  <div><strong>Исполнитель:</strong> Сервис «Схематор» (Schemator.ru)</div>
                  <div><strong>ИНН:</strong> [Укажите ваш ИНН, например: 770000000000]</div>
                  <div><strong>ОГРНИП / ОГРН:</strong> [Укажите ОГРНИП / ОГРН]</div>
                  <div><strong>Домен сервиса:</strong> https://schemator.ru</div>
                  <div><strong>Служба поддержки:</strong> support@schemator.ru</div>
                  <div><strong>Режим работы поддержки:</strong> Ежедневно с 09:00 до 21:00 (МСК)</div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-[#25252D] text-xs">
          <span className="text-zinc-400 dark:text-zinc-500">
            Используя сайт, вы принимаете условия 152-ФЗ РФ и Оферты
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition shadow-sm"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
