import { Card, Classes, HTMLTable, Icon, IconSize, Tag } from "@blueprintjs/core";
import { AddressItem } from "./AddressItem";
import { useTranslation } from "react-i18next";

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

  return (
    <Card>
      <div className="block mb-3">
        <div className="flex items-start gap-3">
          {registrarInfo.info?.image?.Raw ? (
            <img className="h-16 w-16 rounded-full" src={registrarInfo.info.image.Raw as string} alt="" />
          ) : (
            <Icon icon="person" size={IconSize.LARGE * 3} title="No image"></Icon>
          )}
          <div>
            {registrarInfo.info?.display?.Raw ? (
              <div className="text-lg">{registrarInfo.info?.display?.Raw as string}</div>
            ) : (
              <div className="text-lg">{t("user_card.lbl_no_display_name")}</div>
            )}
            <AddressItem address={registrarInfo.account} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <HTMLTable>
          <tbody>
            <tr>
              <td className="shadow-none">{t("user_card.lbl_email")}</td>
              <td className="shadow-none">{registrarInfo.info?.email.Raw as string}</td>
            </tr>
            <tr>
              <td>{t("user_card.lbl_website")}</td>
              <td>{registrarInfo.info?.web.Raw as string}</td>
            </tr>
            <tr>
              <td>{t("user_card.lbl_twitter")}</td>
              <td>{registrarInfo.info?.twitter.Raw as string}</td>
            </tr>
            {registrarInfo.info.additional &&
              registrarInfo.info.additional.map((addItem, i) => {
                return (
                  <tr key={i}>
                    {addItem &&
                      addItem.map((item, j) => {
                        return <td key={item.Raw}>{item.Raw}</td>;
                      })}
                  </tr>
                );
              })}
          </tbody>
        </HTMLTable>
        {registrarInfo.judgements && (
          <div className="mb-2">
            <Tag round large className={`${Classes.BREADCRUMB_CURRENT} bg-green-700 text-green-100`}>
              {typeof registrarInfo.judgements[0][1] == "object"
                ? Object.keys(registrarInfo.judgements[0][1]).map((key, index): any => {
                    if (key in registrarInfo.judgements[0][1]) {
                      return (
                        <span key={index}>
                          {key}: {(registrarInfo.judgements[0][1] as Record<string, string>)[key].toString()}
                        </span>
                      );
                    }
                    return <span key={index}></span>;
                  })
                : registrarInfo.judgements && registrarInfo.judgements[0] && registrarInfo.judgements[0][1]}
            </Tag>
          </div>
        )}
      </div>
    </Card>
  );
}
