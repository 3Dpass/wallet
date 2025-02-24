import { Card, HTMLTable, Icon, IconSize, Tag } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";
import { AccountName } from "./AccountName";

type IRegistrarInfoItem = {
  Raw: string;
};

type IRegistrarInfo = {
  display: IRegistrarInfoItem;
  email: IRegistrarInfoItem;
  web: IRegistrarInfoItem;
  twitter: IRegistrarInfoItem;
  image: IRegistrarInfoItem;
  additional: IRegistrarInfoItem[][];
};

export type IPalletIdentityRegistrarInfo = {
  account: string;
  fee: string;
  fields: number[];
  info: IRegistrarInfo;
  judgements: object[][];
  regIndex: number;
};

type IProps = {
  registrarInfo: IPalletIdentityRegistrarInfo;
};

export default function UserCard({ registrarInfo }: IProps) {
  const { t } = useTranslation();

  const renderSocialLink = (url: string | undefined, label: string) => {
    if (!url) return null;
    return (
      <tr>
        <td className="shadow-none font-medium">{label}</td>
        <td className="shadow-none">
          <a
            href={url.startsWith("http") ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            {url}
          </a>
        </td>
      </tr>
    );
  };

  const renderJudgements = () => {
    if (!registrarInfo.judgements?.length) return null;

    const judgement = registrarInfo.judgements[0][1];
    if (typeof judgement === "object") {
      return Object.entries(judgement).map(([key, value]) => (
        <Tag
          key={key}
          round
          large
          className="mr-2 mb-2 bg-green-700 text-green-100"
        >
          {`${key}: ${value}`}
        </Tag>
      ));
    }

    return (
      <Tag round large className="bg-green-700 text-green-100">
        {judgement}
      </Tag>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <div className="block mb-4">
        <div className="flex items-start gap-4">
          {registrarInfo.info?.image?.Raw ? (
            <img
              className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
              src={registrarInfo.info.image.Raw as string}
              alt={(registrarInfo.info?.display?.Raw as string) || "User"}
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
              <Icon
                icon="person"
                size={IconSize.LARGE * 2}
                className="text-gray-400"
              />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold mb-1">
              {registrarInfo.info?.display?.Raw ||
                t("user_card.lbl_no_display_name")}
            </h2>
            <AccountName address={registrarInfo.account} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <HTMLTable className="w-full">
          <tbody>
            {registrarInfo.info?.email?.Raw && (
              <tr>
                <td className="shadow-none font-medium">
                  {t("user_card.lbl_email")}
                </td>
                <td className="shadow-none">
                  <a
                    href={`mailto:${registrarInfo.info.email.Raw}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {registrarInfo.info.email.Raw}
                  </a>
                </td>
              </tr>
            )}
            {renderSocialLink(
              registrarInfo.info?.web?.Raw as string,
              t("user_card.lbl_website")
            )}
            {renderSocialLink(
              registrarInfo.info?.twitter?.Raw as string,
              t("user_card.lbl_twitter")
            )}
            {registrarInfo.info.additional?.map((addItem, i) => (
              <tr key={`row-${addItem[0]?.Raw}-${i}`}>
                {addItem?.map((item, j) => (
                  <td
                    key={`${item.Raw}-${j}`}
                    className={j === 0 ? "font-medium" : ""}
                  >
                    {item.Raw}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </HTMLTable>

        {registrarInfo.judgements && (
          <div className="flex flex-wrap items-start">{renderJudgements()}</div>
        )}
      </div>
    </Card>
  );
}
